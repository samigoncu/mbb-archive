namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Persistence;

internal sealed class OfficialCorrespondenceOutboxMessage
{
    private OfficialCorrespondenceOutboxMessage() { }

    internal OfficialCorrespondenceOutboxMessage(
        Guid id,
        string eventName,
        string payload,
        DateTimeOffset occurredAt)
    {
        Id = id;
        EventName = eventName;
        Payload = payload;
        OccurredAt = occurredAt;
    }

    public Guid Id { get; private set; }
    public string EventName { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; private set; }
}
