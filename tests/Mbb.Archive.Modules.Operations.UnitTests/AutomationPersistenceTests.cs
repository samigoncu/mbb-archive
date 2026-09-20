using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Npgsql;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Automation;
using Mbb.Archive.Modules.Operations.Application.Models;
using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Infrastructure.Automation;
using Mbb.Archive.Modules.Operations.Infrastructure.Notifications;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;
namespace Mbb.Archive.Modules.Operations.UnitTests;
[TestClass, DoNotParallelize]
public sealed class AutomationPersistenceTests
{
    [TestMethod, TestCategory("PostgreSQL")]
    public async Task ParallelEvaluationsDeduplicateAndFailedDeliveryRetriesWithPersistentHistory()
    {
        await WithDatabase(async connection =>
        {
            var clock = new Clock(); var provider = new FakeProvider();
            await using (var setup = Context(connection))
            {
                var rule = AlertRule.Create("queue", "jobs_active", AlertComparison.GreaterThan, 5, AlertSeverity.Critical, TimeSpan.FromSeconds(1), clock.GetUtcNow());
                rule.SetNotification(NotificationChannel.Email, "operator@example.invalid"); setup.AlertRules.Add(rule); await setup.SaveChangesAsync();
                await Service(setup, clock, provider).EvaluateAsync("test", default);
            }
            clock.Now = clock.Now.AddSeconds(1);
            await using (var one = Context(connection))
            await using (var two = Context(connection))
                await Task.WhenAll(Service(one, clock, provider).EvaluateAsync("one", default), Service(two, clock, provider).EvaluateAsync("two", default));
            await using (var db = Context(connection))
            {
                Assert.AreEqual(1, await db.AlertInstances.CountAsync()); Assert.AreEqual(1, await db.NotificationDeliveries.CountAsync());
                await Service(db, clock, provider).DispatchAsync(default);
                var delivery = await db.NotificationDeliveries.SingleAsync();
                Assert.AreEqual(NotificationDeliveryStatus.RetryScheduled, delivery.Status);
                Assert.AreEqual(1, delivery.AttemptCount);
            }
            provider.Succeeds = true; clock.Now = clock.Now.AddMinutes(1);
            await using (var db = Context(connection))
            {
                await Service(db, clock, provider).DispatchAsync(default);
                var delivery = await db.NotificationDeliveries.SingleAsync();
                Assert.AreEqual(NotificationDeliveryStatus.Sent, delivery.Status); Assert.AreEqual(2, delivery.AttemptCount);
                Assert.AreEqual("local-fake", delivery.ProviderReference);
                Assert.AreEqual(4, await db.AutomationEvents.CountAsync());
                Assert.IsTrue(await db.AutomationEvents.AllAsync(x => x.AuditPublishedAt == null));
                var metrics = await new OperationsStateContributor(db, clock).CollectAsync(default);
                Assert.AreEqual(1d, metrics.Measurements.Single(x => x.Name == "alert_open_total").Value);
                Assert.AreEqual(0d, metrics.Measurements.Single(x => x.Name == "notification_failure_total").Value);
            }
        });
    }
    [TestMethod, TestCategory("PostgreSQL")]
    public async Task RecoveryCompletionRejectsAConcurrentOverwrite()
    {
        await WithDatabase(async connection =>
        {
            Guid id;
            await using (var setup = Context(connection))
            {
                var drill = RecoveryDrill.Plan("backup", "isolated", 5, 30, "tester", DateTimeOffset.UtcNow); drill.Start(DateTimeOffset.UtcNow);
                setup.RecoveryDrills.Add(drill); await setup.SaveChangesAsync(); id = drill.Id;
            }
            await using var first = Context(connection); await using var second = Context(connection);
            var a = await first.RecoveryDrills.SingleAsync(x => x.Id == id); var b = await second.RecoveryDrills.SingleAsync(x => x.Id == id);
            a.Complete(true, 1, 1, "evidence-a", "Successful restore", DateTimeOffset.UtcNow);
            b.Complete(false, 9, 90, "evidence-b", "Failed restore", DateTimeOffset.UtcNow);
            await first.SaveChangesAsync();
            await Assert.ThrowsExactlyAsync<ConcurrencyConflictException>(() => second.SaveChangesAsync());
            await using var check = Context(connection);
            Assert.AreEqual("evidence-a", (await check.RecoveryDrills.SingleAsync()).EvidenceReference);
        });
    }
    private static OperationsDbContext Context(string connection) => new(new DbContextOptionsBuilder<OperationsDbContext>().UseNpgsql(connection).Options);
    private static OperationsAutomationService Service(OperationsDbContext db, Clock clock, FakeProvider provider) =>
        new(db, new Overview(clock), new NotificationDispatcher([provider]), Options.Create(new OperationsAutomationOptions { DeliveryEnabled = true }),
            Options.Create(new EmailNotificationOptions()), Options.Create(new WebhookNotificationOptions()), clock);
    private static async Task WithDatabase(Func<string, Task> run)
    {
        var configured = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(configured)) { Assert.Inconclusive("Set MBB_ARCHIVE_TEST_POSTGRES to a disposable PostgreSQL server."); return; }
        var name = "mbb_operations_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(configured); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        var builder = new NpgsqlConnectionStringBuilder(configured) { Database = name, Pooling = false };
        try { await using (var db = Context(builder.ConnectionString)) await db.Database.MigrateAsync(); await run(builder.ConnectionString); }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    private sealed class Clock : TimeProvider { public DateTimeOffset Now = DateTimeOffset.Parse("2026-09-17T10:00:00Z"); public override DateTimeOffset GetUtcNow() => Now; }
    private sealed class Overview(Clock clock) : IOperationsOverviewProvider
    { public Task<OperationsOverview> GetOverviewAsync(CancellationToken ct) => Task.FromResult(new OperationsOverview(clock.GetUtcNow(), OperationalHealth.Healthy,
        [new("processing", OperationalHealth.Healthy, clock.GetUtcNow(), [new("jobs_active", 10)], [])], [], [])); }
    private sealed class FakeProvider : INotificationChannel
    {
        public bool Succeeds; public NotificationChannel Channel => NotificationChannel.Email;
        public Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken ct) =>
            Task.FromResult(new NotificationSendResult(Succeeds, Succeeds ? "local-fake" : null, Succeeds ? null : "local failure"));
    }
}
