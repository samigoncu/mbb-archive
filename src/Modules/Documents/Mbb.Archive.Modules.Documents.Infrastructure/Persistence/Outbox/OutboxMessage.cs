namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

internal sealed class OutboxMessage
{
    private OutboxMessage()
    {
    }

    internal OutboxMessage(
        Guid id,
        string eventName,
        string payload,
        DateTimeOffset occurredAt)
    {
        Id = id;
        EventName = eventName;
        Payload = payload;
        OccurredAt = occurredAt;
        NextAttemptAt = occurredAt;
    }

    public Guid Id { get; private set; }
    public string EventName { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset NextAttemptAt { get; private set; }
    public DateTimeOffset? ProcessedAt { get; private set; }
    public DateTimeOffset? DeadLetteredAt { get; private set; }
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public string? LockedBy { get; private set; }
    public DateTimeOffset? LockedUntil { get; private set; }

    public void AcquireLease(
        string workerId,
        DateTimeOffset lockedUntil)
    {
        if (ProcessedAt is not null || DeadLetteredAt is not null)
            throw new InvalidOperationException("Completed outbox message cannot be leased.");

        LockedBy = workerId;
        LockedUntil = lockedUntil;
    }

    public void MarkPublished(
        string workerId,
        DateTimeOffset now)
    {
        EnsureLeaseOwner(workerId);

        ProcessedAt = now;
        LastError = null;
        LockedBy = null;
        LockedUntil = null;
    }

    public void MarkFailed(
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts)
    {
        EnsureLeaseOwner(workerId);

        AttemptCount++;
        LastError = Truncate(error, 4000);
        LockedBy = null;
        LockedUntil = null;

        if (AttemptCount >= maxAttempts)
        {
            DeadLetteredAt = now;
            return;
        }

        NextAttemptAt = nextAttemptAt;
    }

    private void EnsureLeaseOwner(string workerId)
    {
        if (!string.Equals(LockedBy, workerId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Outbox message lease is owned by another publisher instance.");
        }
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength
            ? value
            : value[..maxLength];
}
