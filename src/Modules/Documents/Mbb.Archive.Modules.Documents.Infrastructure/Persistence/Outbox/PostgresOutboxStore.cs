using Microsoft.EntityFrameworkCore;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

/// <summary>
/// Çoklu API instance'ında aynı Outbox satırının paralel publish edilmesini
/// PostgreSQL FOR UPDATE SKIP LOCKED + kısa süreli lease ile önler.
/// </summary>
internal sealed class PostgresOutboxStore : IOutboxStore
{
    private readonly DocumentsDbContext _dbContext;

    public PostgresOutboxStore(DocumentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<OutboxEnvelope>> ClaimBatchAsync(
        string workerId,
        DateTimeOffset now,
        int batchSize,
        TimeSpan leaseDuration,
        CancellationToken cancellationToken)
    {
        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        var messages = await _dbContext.OutboxMessages
            .FromSqlInterpolated(
                $"""
                SELECT *
                FROM documents.outbox_messages
                WHERE processed_at IS NULL
                  AND dead_lettered_at IS NULL
                  AND next_attempt_at <= {now}
                  AND (locked_until IS NULL OR locked_until < {now})
                ORDER BY occurred_at
                LIMIT {batchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(cancellationToken);

        var lockedUntil = now.Add(leaseDuration);

        foreach (var message in messages)
            message.AcquireLease(workerId, lockedUntil);

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return messages
            .Select(message => new OutboxEnvelope(
                message.Id,
                message.EventName,
                message.Payload,
                message.OccurredAt,
                message.AttemptCount))
            .ToArray();
    }

    public async Task MarkPublishedAsync(
        Guid messageId,
        string workerId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var message = await GetRequiredAsync(messageId, cancellationToken);
        message.MarkPublished(workerId, now);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkFailedAsync(
        Guid messageId,
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts,
        CancellationToken cancellationToken)
    {
        var message = await GetRequiredAsync(messageId, cancellationToken);

        message.MarkFailed(
            workerId,
            error,
            now,
            nextAttemptAt,
            maxAttempts);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<OutboxMessage> GetRequiredAsync(
        Guid messageId,
        CancellationToken cancellationToken)
        => await _dbContext.OutboxMessages
            .SingleOrDefaultAsync(
                x => x.Id == messageId,
                cancellationToken)
            ?? throw new InvalidOperationException(
                $"Outbox message '{messageId}' was not found.");
}
