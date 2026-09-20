using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;

namespace Mbb.Archive.Modules.Operations.Application.Automation;

public static class OperationsMetricCatalog
{
    public static readonly string[] All = ["dlq_messages", "jobs_active", "jobs_failed", "index_pending", "index_dead_letter",
        "tasks_overdue", "loans_overdue", "security_pending", "ingestion_rejected", "outbox_pending", "outbox_dead_letter",
        "validation_invalid", "validation_indeterminate", "unhealthy_components", "notification_failure_total", "recovery_drill_failures"];
}
public sealed record AutomationStatus(bool DeliveryEnabled, IReadOnlyList<string> Metrics, bool EmailConfigured, bool WebhookConfigured);
public sealed record EvaluationSummary(int Opened, int Resolved, IReadOnlyList<string> MissingMetrics);
public sealed record DeliveryDetails(Guid Id, Guid? AlertId, string Channel, string Target, string Status,
    int AttemptCount, string LastError, DateTimeOffset CreatedAt, DateTimeOffset? NextAttemptAt, DateTimeOffset? SentAt, string ProviderReference);
public sealed record AutomationHistory(Guid Id, string Kind, string EntityId, string Actor, string Detail, DateTimeOffset OccurredAt);
public interface IOperationsAutomation
{
    AutomationStatus Status { get; }
    Task<EvaluationSummary> EvaluateAsync(string actor, CancellationToken ct);
    Task<IReadOnlyList<DeliveryDetails>> DeliveriesAsync(CancellationToken ct);
    Task<IReadOnlyList<AutomationHistory>> HistoryAsync(CancellationToken ct);
    Task<Result> SetRuleEnabledAsync(Guid ruleId, bool enabled, string actor, CancellationToken ct);
    Task<Result> RetryAsync(Guid deliveryId, string actor, CancellationToken ct);
}

public static class AlertEvaluation
{
    public static AlertInstance? Apply(AlertRule rule, AlertInstance? active, decimal? value, DateTimeOffset now)
    {
        if (!value.HasValue) { rule.MissingMeasurement("Ölçüm alınamadı; alarm durumu değiştirilmedi."); return active; }
        var triggered = rule.Evaluate(value.Value, now);
        if (!rule.IsTriggered(value.Value)) { active?.Resolve(now); return active; }
        if (!triggered) return active;
        if (active is null || active.Status == AlertStatus.Resolved)
            return AlertInstance.Open(rule.Id, rule.Code, rule.Severity, value.Value, now);
        active.Observe(value.Value, rule.Severity, now);
        return active;
    }
}

public sealed class NotificationDispatcher(IEnumerable<INotificationChannel> channels)
{
    public async Task SendAsync(NotificationDelivery delivery, DateTimeOffset now, CancellationToken ct)
    {
        delivery.BeginAttempt();
        var channel = channels.SingleOrDefault(x => x.Channel == delivery.Channel);
        NotificationSendResult result;
        try
        {
            result = channel is null ? new(false, null, "Bildirim sağlayıcısı tanımlı değil.") :
                await channel.SendAsync(delivery.Target,
                    new NotificationMessage(delivery.Subject, delivery.Body,
                        new Dictionary<string, string> { ["deliveryId"] = delivery.Id.ToString(), ["alertId"] = delivery.AlertId?.ToString() ?? "" }), ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception) { result = new(false, null, "Bildirim sağlayıcısı isteği tamamlayamadı."); }
        if (result.Succeeded) delivery.MarkSent(now, result.ProviderReference);
        else delivery.MarkFailed(result.Error ?? "Bildirim gönderilemedi.", now, 5);
    }
}
