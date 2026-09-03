namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

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

    public void AcquireLease(string workerId, DateTimeOffset lockedUntil)
    {
        LockedBy = workerId;
        LockedUntil = lockedUntil;
    }

    public void MarkPublished(string workerId, DateTimeOffset now)
    {
        EnsureLease(workerId);
        ProcessedAt = now;
        LockedBy = null;
        LockedUntil = null;
        LastError = null;
    }

    public void MarkFailed(
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts)
    {
        EnsureLease(workerId);
        AttemptCount++;
        LastError = error.Length <= 4000 ? error : error[..4000];
        LockedBy = null;
        LockedUntil = null;

        if (AttemptCount >= maxAttempts)
            DeadLetteredAt = now;
        else
            NextAttemptAt = nextAttemptAt;
    }

    private void EnsureLease(string workerId)
    {
        if (!string.Equals(LockedBy, workerId, StringComparison.Ordinal))
            throw new InvalidOperationException("Processing Outbox lease owner mismatch.");
    }
}
