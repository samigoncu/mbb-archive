using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure;

internal sealed class PhysicalArchiveOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly PhysicalArchiveDbContext _db;
    private readonly TimeProvider _timeProvider;

    public PhysicalArchiveOperationalSnapshotContributor(
        PhysicalArchiveDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "physical_archive";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();

        var folders = await _db.Folders.AsNoTracking().LongCountAsync(
            cancellationToken);

        var overdue = await _db.Loans.AsNoTracking().LongCountAsync(
            x =>
                x.Status != PhysicalLoanStatus.Returned
                && x.DueAt < now,
            cancellationToken);

        var outboxPending = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            cancellationToken);

        var health = overdue > 50
            ? OperationalHealth.Unhealthy
            : overdue > 0 || outboxPending > 100
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            now,
            [
                new("folders", folders),
                new("loans_overdue", overdue),
                new("outbox_pending", outboxPending)
            ],
            overdue > 0
                ? [new(OperationalHealth.Degraded, "physical_archive.loan_overdue", $"{overdue} loans are overdue.")]
                : []);
    }
}
