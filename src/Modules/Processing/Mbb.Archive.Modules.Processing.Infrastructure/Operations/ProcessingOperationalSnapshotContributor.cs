using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Operations;

internal sealed class ProcessingOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly ProcessingDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ProcessingOperationalSnapshotContributor(
        ProcessingDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "processing";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var active = await _db.Jobs.AsNoTracking().LongCountAsync(
            x =>
                x.Stage != ProcessingStage.Completed
                && x.Stage != ProcessingStage.Failed
                && x.Stage != ProcessingStage.Unsupported,
            cancellationToken);

        var failed = await _db.Jobs.AsNoTracking().LongCountAsync(
            x => x.Stage == ProcessingStage.Failed,
            cancellationToken);

        var pendingOutbox = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            x => x.ProcessedAt == null && x.DeadLetteredAt == null,
            cancellationToken);

        var deadOutbox = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            x => x.DeadLetteredAt != null,
            cancellationToken);

        var health = deadOutbox > 0 || failed > 50
            ? OperationalHealth.Unhealthy
            : active > 250 || failed > 0
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            _timeProvider.GetUtcNow(),
            [
                new("jobs_active", active),
                new("jobs_failed", failed),
                new("outbox_pending", pendingOutbox),
                new("outbox_dead_letter", deadOutbox)
            ],
            deadOutbox > 0
                ? [new(OperationalHealth.Unhealthy, "processing.outbox_dead_letter", $"{deadOutbox} messages dead-lettered.")]
                : []);
    }
}
