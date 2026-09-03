using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Evidence.Domain.Validations;
using Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Evidence.Infrastructure;

internal sealed class EvidenceOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly EvidenceDbContext _db;
    private readonly TimeProvider _timeProvider;

    public EvidenceOperationalSnapshotContributor(
        EvidenceDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "evidence";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var pending = await _db.Validations.AsNoTracking().LongCountAsync(
            x => x.Status == EvidenceValidationStatus.Pending,
            cancellationToken);

        var invalid = await _db.Validations.AsNoTracking().LongCountAsync(
            x => x.Status == EvidenceValidationStatus.Invalid,
            cancellationToken);

        var indeterminate = await _db.Validations.AsNoTracking().LongCountAsync(
            x => x.Status == EvidenceValidationStatus.Indeterminate,
            cancellationToken);

        var outboxPending = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            cancellationToken);

        var health = pending > 100
            ? OperationalHealth.Unhealthy
            : pending > 0 || outboxPending > 100
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            _timeProvider.GetUtcNow(),
            [
                new("validation_pending", pending),
                new("validation_invalid", invalid),
                new("validation_indeterminate", indeterminate),
                new("outbox_pending", outboxPending)
            ],
            pending > 0
                ? [new(OperationalHealth.Degraded, "evidence.validation_pending", $"{pending} validations are pending.")]
                : []);
    }
}
