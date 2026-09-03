using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

internal sealed class EfOutboxQueries : IOutboxQueries
{
    private readonly DocumentsDbContext _dbContext;

    public EfOutboxQueries(DocumentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<OutboxStatus> GetStatusAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x =>
                    x.ProcessedAt == null &&
                    x.DeadLetteredAt == null &&
                    (x.LockedUntil == null || x.LockedUntil < now),
                cancellationToken);

        var processing = await _dbContext.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x =>
                    x.ProcessedAt == null &&
                    x.DeadLetteredAt == null &&
                    x.LockedUntil >= now,
                cancellationToken);

        var processed = await _dbContext.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x => x.ProcessedAt != null,
                cancellationToken);

        var deadLettered = await _dbContext.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x => x.DeadLetteredAt != null,
                cancellationToken);

        return new OutboxStatus(
            pending,
            processing,
            processed,
            deadLettered);
    }
}
