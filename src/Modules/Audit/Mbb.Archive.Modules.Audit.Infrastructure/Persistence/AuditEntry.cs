namespace Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

/// <summary>
/// Immutable audit journal row. Mutation methods are intentionally absent;
/// audit history is append-only at the application level.
/// </summary>
public sealed class AuditEntry
{
    private AuditEntry()
    {
    }

    internal AuditEntry(
        long sequence,
        Guid messageId,
        string eventName,
        string payload,
        Guid? documentId,
        DateTimeOffset occurredAt,
        DateTimeOffset receivedAt,
        string previousHash,
        string entryHash)
    {
        Sequence = sequence;
        MessageId = messageId;
        EventName = eventName;
        Payload = payload;
        DocumentId = documentId;
        OccurredAt = occurredAt;
        ReceivedAt = receivedAt;
        PreviousHash = previousHash;
        EntryHash = entryHash;
    }

    public long Sequence { get; private set; }
    public Guid MessageId { get; private set; }
    public string EventName { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public Guid? DocumentId { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset ReceivedAt { get; private set; }
    public string PreviousHash { get; private set; } = string.Empty;
    public string EntryHash { get; private set; } = string.Empty;
}
