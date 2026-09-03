namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

internal interface IOutboxStore
{
    Task<IReadOnlyList<OutboxEnvelope>> ClaimBatchAsync(
        string workerId,
        DateTimeOffset now,
        int batchSize,
        TimeSpan leaseDuration,
        CancellationToken cancellationToken);

    Task MarkPublishedAsync(
        Guid messageId,
        string workerId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task MarkFailedAsync(
        Guid messageId,
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts,
        CancellationToken cancellationToken);
}
