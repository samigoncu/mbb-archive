namespace Mbb.Archive.BuildingBlocks.Application;

/// <summary>
/// Bounded context dışına çıkmasına izin verilen versioned public event contract'ı.
/// Domain event ile aynı kavram değildir.
/// </summary>
public interface IIntegrationEvent
{
    Guid EventId { get; }
    DateTimeOffset OccurredAt { get; }
    string EventName { get; }
}

public interface IOutbox
{
    void Enqueue(IIntegrationEvent integrationEvent);
}
