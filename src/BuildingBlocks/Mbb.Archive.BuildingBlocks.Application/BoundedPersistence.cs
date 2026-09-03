namespace Mbb.Archive.BuildingBlocks.Application;

/// <summary>
/// Marker-typed persistence contracts prevent one bounded context from accidentally
/// resolving another context's DbContext through the root DI container.
/// </summary>
public interface IUnitOfWork<TBoundary>
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IOutbox<TBoundary>
{
    void Enqueue(IIntegrationEvent integrationEvent);
}

public interface IInbox<TBoundary>
{
    Task<bool> HasProcessedAsync(
        Guid messageId,
        CancellationToken cancellationToken);

    void MarkProcessed(
        Guid messageId,
        string eventName,
        DateTimeOffset processedAt);
}
