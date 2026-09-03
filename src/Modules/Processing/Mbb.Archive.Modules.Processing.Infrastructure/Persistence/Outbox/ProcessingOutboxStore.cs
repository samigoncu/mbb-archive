using Microsoft.EntityFrameworkCore;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

internal sealed class ProcessingOutboxStore
{
    private readonly ProcessingDbContext _dbContext;

    public ProcessingOutboxStore(ProcessingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProcessingOutboxEnvelope>> ClaimAsync(
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
                FROM processing.outbox_messages
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
            .Select(x => new ProcessingOutboxEnvelope(
                x.Id,
                x.EventName,
                x.Payload,
                x.OccurredAt,
                x.AttemptCount))
            .ToArray();
    }

    public async Task MarkPublishedAsync(
        Guid id,
        string workerId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var message = await RequiredAsync(id, cancellationToken);
        message.MarkPublished(workerId, now);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkFailedAsync(
        Guid id,
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts,
        CancellationToken cancellationToken)
    {
        var message = await RequiredAsync(id, cancellationToken);
        message.MarkFailed(
            workerId,
            error,
            now,
            nextAttemptAt,
            maxAttempts);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<OutboxMessage> RequiredAsync(
        Guid id,
        CancellationToken cancellationToken)
        => await _dbContext.OutboxMessages
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Processing Outbox message '{id}' was not found.");
}
