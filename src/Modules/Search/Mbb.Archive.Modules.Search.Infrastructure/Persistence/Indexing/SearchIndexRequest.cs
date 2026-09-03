namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Indexing;

internal sealed class SearchIndexRequest
{
    private SearchIndexRequest() { }

    internal SearchIndexRequest(
        Guid documentId,
        long projectionRevision,
        DateTimeOffset requestedAt)
    {
        DocumentId = documentId;
        ProjectionRevision = projectionRevision;
        RequestedAt = requestedAt;
        NextAttemptAt = requestedAt;
    }

    public Guid DocumentId { get; private set; }
    public long ProjectionRevision { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset NextAttemptAt { get; private set; }
    public DateTimeOffset? IndexedAt { get; private set; }
    public DateTimeOffset? DeadLetteredAt { get; private set; }
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public string? LockedBy { get; private set; }
    public DateTimeOffset? LockedUntil { get; private set; }

    internal void Refresh(long revision, DateTimeOffset requestedAt)
    {
        if (revision <= ProjectionRevision && IndexedAt is null)
            return;

        ProjectionRevision = revision;
        RequestedAt = requestedAt;
        NextAttemptAt = requestedAt;
        IndexedAt = null;
        DeadLetteredAt = null;
        AttemptCount = 0;
        LastError = null;
        LockedBy = null;
        LockedUntil = null;
    }

    internal void Lease(string workerId, DateTimeOffset lockedUntil)
    { LockedBy=workerId; LockedUntil=lockedUntil; }

    internal void MarkIndexed(string workerId, DateTimeOffset now)
    {
        EnsureLease(workerId);
        IndexedAt=now; LockedBy=null; LockedUntil=null; LastError=null;
    }

    internal void MarkFailed(
        string workerId,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttemptAt,
        int maxAttempts)
    {
        EnsureLease(workerId);
        AttemptCount++;
        LastError=error.Length<=4000?error:error[..4000];
        LockedBy=null; LockedUntil=null;
        if(AttemptCount>=maxAttempts) DeadLetteredAt=now; else NextAttemptAt=nextAttemptAt;
    }

    private void EnsureLease(string workerId)
    {
        if(!string.Equals(LockedBy,workerId,StringComparison.Ordinal))
            throw new InvalidOperationException("Search index request lease owner mismatch.");
    }
}
