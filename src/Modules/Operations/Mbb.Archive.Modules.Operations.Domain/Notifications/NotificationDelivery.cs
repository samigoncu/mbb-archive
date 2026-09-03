using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Notifications;

public enum NotificationChannel { Email, Webhook, Sms, MicrosoftTeams, Slack }
public enum NotificationDeliveryStatus { Pending, Sending, Sent, RetryScheduled, DeadLettered }

public sealed class NotificationDelivery : AggregateRoot<Guid>
{
    private NotificationDelivery() { }
    private NotificationDelivery(NotificationChannel channel, string target, DateTimeOffset now)
        : base(Guid.CreateVersion7())
    {
        if (string.IsNullOrWhiteSpace(target)) throw new DomainRuleViolationException("Notification target is required.");
        Channel = channel; Target = target.Trim(); Status = NotificationDeliveryStatus.Pending; CreatedAt = now; NextAttemptAt = now;
    }
    public NotificationChannel Channel { get; private set; }
    public string Target { get; private set; } = string.Empty;
    public NotificationDeliveryStatus Status { get; private set; }
    public int AttemptCount { get; private set; }
    public string LastError { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? NextAttemptAt { get; private set; }
    public DateTimeOffset? SentAt { get; private set; }

    public static NotificationDelivery Queue(NotificationChannel channel, string target, DateTimeOffset now) => new(channel, target, now);
    public void BeginAttempt() { if (Status is NotificationDeliveryStatus.Sent or NotificationDeliveryStatus.DeadLettered) throw new DomainRuleViolationException("Notification is terminal."); Status = NotificationDeliveryStatus.Sending; AttemptCount++; }
    public void MarkSent(DateTimeOffset now) { if (Status != NotificationDeliveryStatus.Sending) throw new DomainRuleViolationException("Notification is not being sent."); Status = NotificationDeliveryStatus.Sent; SentAt = now; NextAttemptAt = null; LastError = string.Empty; }
    public void MarkFailed(string error, DateTimeOffset now, int maxAttempts)
    {
        if (Status != NotificationDeliveryStatus.Sending || maxAttempts <= 0) throw new DomainRuleViolationException("Notification retry state is invalid.");
        LastError = string.IsNullOrWhiteSpace(error) ? "Unknown delivery failure." : error.Trim();
        if (AttemptCount >= maxAttempts) { Status = NotificationDeliveryStatus.DeadLettered; NextAttemptAt = null; return; }
        var delayMinutes = Math.Min(60, 1 << Math.Min(AttemptCount - 1, 5));
        Status = NotificationDeliveryStatus.RetryScheduled; NextAttemptAt = now.AddMinutes(delayMinutes);
    }
}
