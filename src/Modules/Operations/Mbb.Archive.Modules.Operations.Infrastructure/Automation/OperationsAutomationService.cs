using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Automation;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;
using Mbb.Archive.Modules.Operations.Infrastructure.Notifications;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Automation;

public sealed class OperationsAutomationOptions
{
    public const string SectionName = "Operations:Automation";
    public bool DeliveryEnabled { get; init; }
}
public sealed class OperationsAutomationEvent
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public string Kind { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string Actor { get; set; } = "";
    public string Detail { get; set; } = "";
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset? AuditPublishedAt { get; set; }
}

internal sealed class OperationsAutomationService(OperationsDbContext db, IOperationsOverviewProvider overview,
    NotificationDispatcher dispatcher, IOptions<OperationsAutomationOptions> options, IOptions<EmailNotificationOptions> email,
    IOptions<WebhookNotificationOptions> webhook, TimeProvider time) : IOperationsAutomation
{
    public AutomationStatus Status => new(options.Value.DeliveryEnabled, OperationsMetricCatalog.All,
        !string.IsNullOrWhiteSpace(email.Value.Host) && !string.IsNullOrWhiteSpace(email.Value.Sender), webhook.Value.AllowedHosts.Length > 0);

    public async Task<EvaluationSummary> EvaluateAsync(string actor, CancellationToken ct)
    {
        var snapshot = await overview.GetOverviewAsync(ct);
        var values = snapshot.Components.SelectMany(x => x.Measurements).GroupBy(x => x.Name)
            .ToDictionary(g => g.Key, g => (decimal)g.Sum(x => x.Value));
        if (snapshot.Dependencies.Any(x => x.Name.Contains("rabbit", StringComparison.OrdinalIgnoreCase) &&
            x.Health is Mbb.Archive.BuildingBlocks.Observability.OperationalHealth.Healthy or Mbb.Archive.BuildingBlocks.Observability.OperationalHealth.Degraded))
            values["dlq_messages"] = snapshot.Queues.Where(x => x.IsDeadLetterQueue).Sum(x => x.Total);
        if (snapshot.Components.Any(x => x.Issues.Any(issue => issue.Code == "operations.snapshot_failed")))
        { values.Remove("outbox_pending"); values.Remove("outbox_dead_letter"); }
        values["unhealthy_components"] = snapshot.Components.Count(x => x.Health == Mbb.Archive.BuildingBlocks.Observability.OperationalHealth.Unhealthy);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855301)", ct);
        var rules = await db.AlertRules.Where(x => x.IsEnabled).ToListAsync(ct);
        var active = await db.AlertInstances.Where(x => x.Status != AlertStatus.Resolved).ToListAsync(ct);
        var now = time.GetUtcNow(); var opened = 0; var resolved = 0; var missing = new List<string>();
        foreach (var rule in rules)
        {
            var previous = active.SingleOrDefault(x => x.RuleId == rule.Id);
            var measured = values.TryGetValue(rule.Metric, out var value);
            if (!measured) missing.Add(rule.Metric);
            var alert = AlertEvaluation.Apply(rule, previous, measured ? value : null, now);
            if (alert is not null && !ReferenceEquals(alert, previous))
            {
                db.AlertInstances.Add(alert); opened++;
                AddEvent("alert.opened", alert.Id, actor, rule.Code, now);
                if (rule.NotificationChannel is { } channel)
                {
                    var delivery = NotificationDelivery.ForAlert(alert.Id, channel, rule.NotificationTarget,
                        $"Arşiv alarmı: {rule.Code}", $"{rule.Metric}: {value}; eşik: {rule.Threshold}", now);
                    db.NotificationDeliveries.Add(delivery);
                    AddEvent("notification.queued", delivery.Id, actor, alert.Id.ToString(), now);
                }
            }
            else if (previous?.Status == AlertStatus.Resolved)
            { resolved++; AddEvent("alert.resolved", previous.Id, actor, rule.Code, now); }
        }
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return new(opened, resolved, missing.Distinct().ToArray());
    }

    public async Task DispatchAsync(CancellationToken ct)
    {
        if (!options.Value.DeliveryEnabled) return;
        // The transaction lock serializes dispatcher instances. Providers receive a stable delivery ID;
        // transport acknowledgements cannot promise exactly-once delivery after a process crash.
        for (var i = 0; i < 20; i++)
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855302)", ct);
            var now = time.GetUtcNow();
            var item = await db.NotificationDeliveries.Where(x =>
                (x.Status == NotificationDeliveryStatus.Pending || x.Status == NotificationDeliveryStatus.RetryScheduled)
                && x.NextAttemptAt <= now).OrderBy(x => x.NextAttemptAt).FirstOrDefaultAsync(ct);
            if (item is null) { await tx.CommitAsync(ct); break; }
            await dispatcher.SendAsync(item, now, ct);
            AddEvent(item.Status == NotificationDeliveryStatus.Sent ? "notification.sent" : "notification.failed",
                item.Id, "system:operations", $"Deneme {item.AttemptCount}: {item.Status}. {item.LastError}", now);
            await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        }
    }

    public async Task<Result> SetRuleEnabledAsync(Guid ruleId, bool enabled, string actor, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855301)", ct);
        var rule = await db.AlertRules.SingleOrDefaultAsync(x => x.Id == ruleId, ct);
        if (rule is null) return Result.Failure(Error.NotFound("operations.rule_not_found", "Alarm kuralı bulunamadı."));
        rule.SetEnabled(enabled, time.GetUtcNow()); rule.MissingMeasurement();
        AddEvent("rule.enabled_changed", rule.Id, actor, enabled ? "Etkin" : "Pasif", time.GetUtcNow());
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return Result.Success();
    }
    public async Task<Result> RetryAsync(Guid deliveryId, string actor, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855302)", ct);
        var delivery = await db.NotificationDeliveries.SingleOrDefaultAsync(x => x.Id == deliveryId, ct);
        if (delivery is null) return Result.Failure(Error.NotFound("operations.notification_not_found", "Bildirim bulunamadı."));
        try { delivery.Retry(time.GetUtcNow()); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("operations.notification_conflict", ex.Message)); }
        AddEvent("notification.retry_requested", delivery.Id, actor, "Yeniden deneme kuyruğa alındı.", time.GetUtcNow());
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return Result.Success();
    }
    public async Task<IReadOnlyList<DeliveryDetails>> DeliveriesAsync(CancellationToken ct) =>
        await db.NotificationDeliveries.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(100)
            .Select(x => new DeliveryDetails(x.Id, x.AlertId, x.Channel.ToString(), x.Target, x.Status.ToString(), x.AttemptCount,
                x.LastError, x.CreatedAt, x.NextAttemptAt, x.SentAt, x.ProviderReference)).ToListAsync(ct);
    public async Task<IReadOnlyList<AutomationHistory>> HistoryAsync(CancellationToken ct) =>
        await db.AutomationEvents.AsNoTracking().OrderByDescending(x => x.OccurredAt).Take(100)
            .Select(x => new AutomationHistory(x.Id, x.Kind, x.EntityId, x.Actor, x.Detail, x.OccurredAt)).ToListAsync(ct);
    private void AddEvent(string kind, Guid id, string actor, string detail, DateTimeOffset now) =>
        db.AutomationEvents.Add(new() { Kind = kind, EntityId = id.ToString(), Actor = actor, Detail = detail, OccurredAt = now });
}
