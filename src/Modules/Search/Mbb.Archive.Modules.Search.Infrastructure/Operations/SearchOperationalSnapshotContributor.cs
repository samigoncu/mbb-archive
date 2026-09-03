using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Search.Infrastructure.Operations;

internal sealed class SearchOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly SearchDbContext _db;
    private readonly TimeProvider _timeProvider;

    public SearchOperationalSnapshotContributor(
        SearchDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "search";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var pending = await _db.IndexRequests.AsNoTracking().LongCountAsync(
            x => x.IndexedAt == null && x.DeadLetteredAt == null,
            cancellationToken);

        var dead = await _db.IndexRequests.AsNoTracking().LongCountAsync(
            x => x.DeadLetteredAt != null,
            cancellationToken);

        var projectionCount = await _db.Documents.AsNoTracking().LongCountAsync(
            cancellationToken);

        var health = dead > 0
            ? OperationalHealth.Unhealthy
            : pending > 500
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            _timeProvider.GetUtcNow(),
            [
                new("index_pending", pending),
                new("index_dead_letter", dead),
                new("projection_documents", projectionCount)
            ],
            dead > 0
                ? [new(OperationalHealth.Unhealthy, "search.index_dead_letter", $"{dead} index requests are dead-lettered.")]
                : []);
    }
}
