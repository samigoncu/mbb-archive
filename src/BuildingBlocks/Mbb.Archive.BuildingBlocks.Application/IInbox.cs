namespace Mbb.Archive.BuildingBlocks.Application;

/// <summary>
/// At-least-once message delivery altında application state mutation'larının
/// aynı integration event için yalnızca bir kez uygulanmasını sağlar.
/// </summary>
public interface IInbox
{
    Task<bool> HasProcessedAsync(
        Guid messageId,
        CancellationToken cancellationToken);

    void MarkProcessed(
        Guid messageId,
        string eventName,
        DateTimeOffset processedAt);
}
