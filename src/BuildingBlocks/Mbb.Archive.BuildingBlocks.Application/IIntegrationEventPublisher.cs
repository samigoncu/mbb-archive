namespace Mbb.Archive.BuildingBlocks.Application;

/// <summary>
/// Transactional Outbox'tan çıkmış serialized integration event'i
/// harici message broker'a publish eder.
/// </summary>
public interface IIntegrationEventPublisher
{
    Task PublishAsync(
        Guid messageId,
        string eventName,
        string payload,
        DateTimeOffset occurredAt,
        CancellationToken cancellationToken);
}
