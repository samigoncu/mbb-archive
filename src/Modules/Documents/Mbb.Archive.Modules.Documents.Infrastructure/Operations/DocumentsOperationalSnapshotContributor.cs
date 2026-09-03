using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Operations;

internal sealed class DocumentsOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly DocumentsDbContext _db;
    private readonly TimeProvider _timeProvider;

    public DocumentsOperationalSnapshotContributor(
        DocumentsDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "documents";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var pendingOutbox = await _db.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x => x.ProcessedAt == null && x.DeadLetteredAt == null,
                cancellationToken);

        var deadOutbox = await _db.OutboxMessages
            .AsNoTracking()
            .LongCountAsync(
                x => x.DeadLetteredAt != null,
                cancellationToken);

        var pendingSecurity = await _db.FileIngestions
            .AsNoTracking()
            .LongCountAsync(
                x => x.Status == DocumentFileIngestionStatus.PendingSecurityScan,
                cancellationToken);

        var rejected = await _db.FileIngestions
            .AsNoTracking()
            .LongCountAsync(
                x => x.Status == DocumentFileIngestionStatus.Rejected,
                cancellationToken);

        var health = deadOutbox > 0
            ? OperationalHealth.Unhealthy
            : pendingOutbox > 100 || pendingSecurity > 100
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        var issues = new List<OperationalIssue>();

        if (deadOutbox > 0)
        {
            issues.Add(
                new OperationalIssue(
                    OperationalHealth.Unhealthy,
                    "documents.outbox_dead_letter",
                    $"{deadOutbox} Documents Outbox messages are dead-lettered."));
        }

        if (pendingSecurity > 100)
        {
            issues.Add(
                new OperationalIssue(
                    OperationalHealth.Degraded,
                    "documents.security_backlog",
                    $"Security-scan backlog is {pendingSecurity}."));
        }

        return new OperationalComponentSnapshot(
            Component,
            health,
            _timeProvider.GetUtcNow(),
            [
                new("outbox_pending", pendingOutbox),
                new("outbox_dead_letter", deadOutbox),
                new("security_pending", pendingSecurity),
                new("ingestion_rejected", rejected)
            ],
            issues);
    }
}
