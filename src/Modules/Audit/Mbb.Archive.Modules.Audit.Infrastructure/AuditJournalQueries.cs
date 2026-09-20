using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
namespace Mbb.Archive.Modules.Audit.Infrastructure;
public sealed class AuditJournalQueries(AuditDbContext db, IAuditDisplayResolver display)
{
    public async Task<IReadOnlyList<AuditEventDetails>> ReadAsync(
        string? eventName, Guid? documentId, string? actor,
        DateTimeOffset? from, DateTimeOffset? to, long? before, int take,
        CancellationToken ct, string? activity = null)
    {
        // Filter before the page limit; the original payload remains untouched.
        var query = string.IsNullOrWhiteSpace(actor)
            ? db.Entries.AsNoTracking()
            : db.Entries.FromSqlInterpolated($"SELECT * FROM audit.entries WHERE payload::jsonb ->> 'actor' = {actor}").AsNoTracking();
        if (activity == "user") query = query.Where(x => x.EventName.StartsWith("access."));
        if (activity == "system") query = query.Where(x => !x.EventName.StartsWith("access."));
        if (!string.IsNullOrWhiteSpace(eventName)) query = query.Where(x => x.EventName == eventName);
        if (documentId is not null) query = query.Where(x => x.DocumentId == documentId);
        if (from is not null) query = query.Where(x => x.OccurredAt >= from);
        if (to is not null) query = query.Where(x => x.OccurredAt < to);
        if (before is not null) query = query.Where(x => x.Sequence < before);
        var entries = await query.OrderByDescending(x => x.Sequence)
            .Take(Math.Clamp(take, 1, 500)).ToListAsync(ct);
        var resources = new Dictionary<(string, string), AuditResourceDisplay?>();
        var results = new List<AuditEventDetails>();
        foreach (var entry in entries)
        {
            var item = AuditEventProjection.Project(entry);
            if (item.ResourceType is { } type && item.ResourceId is { } id)
            {
                var key = (type, id);
                if (!resources.TryGetValue(key, out var resource))
                    resources[key] = resource = await display.ResolveResourceAsync(type, id, ct);
                item = item with { ResourceName = resource?.Name, ResourceUrl = resource?.Url };
            }
            if (item.ActorDisplayName is null && item.Actor is { } subject)
                item = item with { ActorDisplayName = display.ResolveActorName(subject) };
            results.Add(item);
        }
        return results;
    }
    public async Task<IReadOnlyList<AuditActivityRow>> ActivityAsync(DateTimeOffset from, DateTimeOffset to, string? actor, CancellationToken ct)
        => await db.Database.SqlQuery<AuditActivityRow>($"""
            SELECT payload::jsonb ->> 'actor' AS "Actor", event_name AS "EventName",
                   count(*) AS "Count", min(occurred_at) AS "FirstAt", max(occurred_at) AS "LastAt"
            FROM audit.entries
            WHERE occurred_at >= {from} AND occurred_at < {to}
              AND ({actor}::text IS NULL OR payload::jsonb ->> 'actor' = {actor})
            GROUP BY payload::jsonb ->> 'actor', event_name
            ORDER BY count(*) DESC, event_name
            LIMIT 1001
            """).ToListAsync(ct);

}
public sealed record AuditEventDetails(long Sequence, Guid MessageId, string EventName,
    Guid? DocumentId, DateTimeOffset OccurredAt, DateTimeOffset ReceivedAt,
    string PreviousHash, string EntryHash, string? Actor, string? EntityType,
    string? EntityId, string? Outcome, string? IpAddress, string? CorrelationId,
    string? ActorDisplayName = null, string? ResourceType = null, string? ResourceId = null,
    string? ResourceName = null, string? ResourceUrl = null);

public sealed class AuditActivityRow
{
    public string? Actor { get; set; }
    public string EventName { get; set; } = string.Empty;
    public long Count { get; set; }
    public DateTimeOffset FirstAt { get; set; }
    public DateTimeOffset LastAt { get; set; }
}
