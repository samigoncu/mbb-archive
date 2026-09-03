namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Inbox;

internal sealed class InboxMessage
{
    private InboxMessage()
    {
    }

    internal InboxMessage(
        Guid id,
        string eventName,
        DateTimeOffset processedAt)
    {
        Id = id;
        EventName = eventName;
        ProcessedAt = processedAt;
    }

    public Guid Id { get; private set; }
    public string EventName { get; private set; } = string.Empty;
    public DateTimeOffset ProcessedAt { get; private set; }
}
