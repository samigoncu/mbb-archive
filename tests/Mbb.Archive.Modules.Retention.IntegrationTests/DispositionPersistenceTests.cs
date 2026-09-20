using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Npgsql;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;
using Mbb.Archive.Modules.Retention.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Infrastructure;
using Mbb.Archive.Modules.Retention.Contracts;

namespace Mbb.Archive.Modules.Retention.IntegrationTests;

[TestClass, DoNotParallelize]
public sealed class DispositionPersistenceTests
{
    private string _connection = "";
    private static readonly DateTimeOffset Now = new(2026, 9, 5, 0, 0, 0, TimeSpan.Zero);
    [TestInitialize]
    public async Task Initialize()
    {
        var configured = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if (string.IsNullOrEmpty(configured)) Assert.Inconclusive("Set MBB_ARCHIVE_TEST_POSTGRES to an isolated mbb_archive_*tests* database.");
        _connection = configured;
        var database = new NpgsqlConnectionStringBuilder(_connection).Database;
        Assert.IsTrue(database?.StartsWith("mbb_archive_", StringComparison.Ordinal) == true && database.Contains("tests", StringComparison.Ordinal),
            "Integration tests refuse non-test databases.");
        await using var db = Context();
        await db.Database.MigrateAsync();
    }
    private RetentionDbContext Context() => new(new DbContextOptionsBuilder<RetentionDbContext>().UseNpgsql(_connection).Options);
    [TestMethod]
    public async Task ScopedListsAndCounts_ExcludeOtherDocumentsBeforePagination()
    {
        var id = await Seed(); var hiddenId = await Seed();
        await using var db = Context();
        var documentId = (await db.Set<DispositionProcess>().SingleAsync(x => x.Id == id)).DocumentId;
        var services = new ServiceCollection();
        services.AddRetentionModule(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Retention"] = _connection }).Build());
        services.AddSingleton<IDocumentVisibility>(new VisibleDocument(documentId));
        await using var provider = services.BuildServiceProvider(); using var scope = provider.CreateScope();
        var queries = scope.ServiceProvider.GetRequiredService<IRetentionQueries>();
        var cases = await queries.GetCasesPageAsync(PageRequest.Create(1, 1).Value, new(), default);
        Assert.AreEqual(1L, cases.TotalCount); Assert.AreEqual(documentId, cases.Items.Single().DocumentId);
        var dispositions = await scope.ServiceProvider.GetRequiredService<IDispositionRepository>().ListAsync(PageRequest.Create(1, 1).Value, null, default);
        Assert.AreEqual(1L, dispositions.TotalCount); Assert.AreEqual(id, dispositions.Items.Single().Id);
        var ruleCounts = await queries.GetRulesAsync(default);
        Assert.AreEqual(1, ruleCounts.Sum(x => x.CaseCount));
    }

    [TestMethod]
    public async Task PhysicalCompletion_ReloadPreservesProtectionAndEvidenceRequirements()
    {
        await using var db = Context();
        var rule = RetentionRule.Create($"D-{Guid.NewGuid():N}", "Fiziksel imha", 1, DispositionAction.Destroy, Now.AddYears(-1));
        var item = RetentionCase.Schedule(Guid.NewGuid(), Guid.NewGuid(), rule, Now.AddMonths(-2));
        var process = DispositionProcess.Create(Guid.NewGuid(), item, DispositionAction.Destroy, "Gerekçe", "K26", "preparer", 2, Now);
        process.ConfigureCommission("manager", ["r1", "r2"], Now.AddDays(-1), Now.AddYears(1));
        process.Submit("preparer", item, Now); process.Review("r1", true, "Uygun", item, Now); process.Review("r2", true, "Uygun", item, Now);
        process.Approve("approver", "O26", item, Now);
        var evidence = Guid.NewGuid();
        process.ExecuteDestruction("executor", "T26", evidence, Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "A ve B", Now, item, Now);
        db.AddRange(rule, item, process); await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        var reloaded = await db.Set<RetentionCase>().SingleAsync(x => x.Id == item.Id);
        Assert.IsTrue(reloaded.DigitalPreservationRequired); Assert.AreEqual(DispositionAction.KeepPermanent, reloaded.Action);
        var services = new ServiceCollection(); services.AddRetentionModule(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["ConnectionStrings:Retention"] = _connection }).Build());
        await using var provider = services.BuildServiceProvider(); using var scope = provider.CreateScope();
        var protection = await scope.ServiceProvider.GetRequiredService<IRetentionProtectionSource>().ListAsync(default);
        Assert.IsTrue(protection.Any(x => x.DocumentId == item.DocumentId && x.Permanent));
        Assert.IsTrue(protection.Any(x => x.DocumentId == evidence && x.Permanent));
    }

    private sealed class VisibleDocument(Guid documentId) : IDocumentVisibility
    {
        public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct)
            => Task.FromResult<IReadOnlySet<Guid>>(ids.Where(x => x == documentId).ToHashSet());
    }
    private async Task<Guid> Seed(bool reviewed = false)
    {
        await using var db = Context();
        var rule = RetentionRule.Create($"R-{Guid.NewGuid():N}", "Test devir kuralı", 1, DispositionAction.Transfer, Now.AddYears(-1));
        var item = RetentionCase.Schedule(Guid.NewGuid(), Guid.NewGuid(), rule, Now.AddMonths(-2));
        var process = DispositionProcess.Create(Guid.NewGuid(), item, DispositionAction.Transfer, "Test gerekçesi", "Komisyon-test", "preparer", 2, Now);
        process.ConfigureCommission("manager", ["reviewer-1", "reviewer-2"], Now.AddDays(-1), Now.AddYears(1));
        if (reviewed)
        {
            process.Submit("preparer", item, Now);
            process.Review("reviewer-1", true, "Uygun 1", item, Now);
            process.Review("reviewer-2", true, "Uygun 2", item, Now);
        }
        db.Add(rule); db.Add(item); db.Add(process); await db.SaveChangesAsync();
        return process.Id;
    }
    [TestMethod]
    public async Task MigrationAndReload_PreserveReviewAndReceiptEvidence()
    {
        var id = await Seed(reviewed: true);
        await using (var db = Context())
        {
            var process = await db.Set<DispositionProcess>().Include(x => x.Reviews).Include(x => x.Members).SingleAsync(x => x.Id == id);
            var item = await db.Set<RetentionCase>().SingleAsync(x => x.Id == process.RetentionCaseId);
            process.Approve("approver", "Onay-test", item, Now);
            var packageId = Guid.NewGuid();
            process.RegisterTransferPackage(packageId, "{}", new string('a', 64), new string('b', 64), 12, "preparer", item, Now);
            process.VerifyTransferPackage(packageId, "receiver", item, Now);
            process.AcceptTransfer("receiver", "Test arşivi", "Tutanak-test", item, Now);
            await db.SaveChangesAsync();
        }
        await using var verify = Context();
        var stored = await verify.Set<DispositionProcess>().Include(x => x.Reviews).Include(x => x.Members).SingleAsync(x => x.Id == id);
        Assert.AreEqual(DispositionProcessStatus.Completed, stored.Status);
        Assert.AreEqual(2, stored.Reviews.Count); Assert.AreEqual("Uygun 1", stored.Reviews.Single(x => x.Actor == "reviewer-1").Reason);
        Assert.AreEqual("receiver", stored.CompletedBy); Assert.AreEqual("Tutanak-test", stored.ReceiptReference);
    }
    [TestMethod]
    public async Task ConcurrentHold_RollsBackApprovalAndItsOutboxEvent()
    {
        var id = await Seed(reviewed: true);
        await using var approving = Context(); await using var holding = Context();
        var process = await approving.Set<DispositionProcess>().Include(x => x.Reviews).Include(x => x.Members).SingleAsync(x => x.Id == id);
        var staleCase = await approving.Set<RetentionCase>().SingleAsync(x => x.Id == process.RetentionCaseId);
        var heldCase = await holding.Set<RetentionCase>().SingleAsync(x => x.Id == process.RetentionCaseId);
        heldCase.PlaceHold(); await holding.SaveChangesAsync();
        process.Approve("approver", "Onay-test", staleCase, Now);
        var eventId = Guid.NewGuid();
        approving.Enqueue(new Contracts.IntegrationEvents.DispositionChangedIntegrationEvent(eventId, id, staleCase.Id,
            staleCase.DocumentId, "Transfer", "Approve", "PendingApproval", "Approved", "approver", "", "Onay-test", process.ConcurrencyVersion, Now));
        await Assert.ThrowsExactlyAsync<ConcurrencyConflictException>(() => approving.SaveChangesAsync());
        await using var verify = Context();
        Assert.AreEqual(DispositionProcessStatus.PendingApproval, (await verify.Set<DispositionProcess>().SingleAsync(x => x.Id == id)).Status);
        await using var connection = new NpgsqlConnection(_connection); await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT count(*) FROM retention.outbox_messages WHERE id = @id", connection);
        command.Parameters.AddWithValue("id", eventId);
        Assert.AreEqual(0L, (long)(await command.ExecuteScalarAsync())!);
    }
    [TestMethod]
    public async Task Database_RejectsTwoOpenProcessesForSameCase()
    {
        var id = await Seed();
        await using var db = Context();
        var original = await db.Set<DispositionProcess>().SingleAsync(x => x.Id == id);
        var item = await db.Set<RetentionCase>().SingleAsync(x => x.Id == original.RetentionCaseId);
        db.Add(DispositionProcess.Create(Guid.NewGuid(), item, DispositionAction.Transfer, "İkinci", "Komisyon-test", "other", 2, Now));
        await Assert.ThrowsExactlyAsync<ConcurrencyConflictException>(() => db.SaveChangesAsync());
    }
}
