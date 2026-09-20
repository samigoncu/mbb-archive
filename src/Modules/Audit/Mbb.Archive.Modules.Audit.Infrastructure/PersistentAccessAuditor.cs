using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;
namespace Mbb.Archive.Modules.Audit.Infrastructure;
internal sealed class PersistentAccessAuditor(AuditJournalWriter writer, TimeProvider time) : IAccessAuditor
{
    public Task RecordAsync(AccessAuditRecord record, CancellationToken ct)
    {
        var id = Guid.CreateVersion7();
        // PostgreSQL timestamp precision must match the bytes used in the hash.
        var occurred = DateTimeOffset.FromUnixTimeMilliseconds(time.GetUtcNow().ToUnixTimeMilliseconds());
        var payload = JsonSerializer.Serialize(new {
            eventId = id, occurredAt = occurred, eventName = record.EventName,
            entityType = record.EntityType, entityId = record.EntityId,
            documentId = record.EntityType == "document" ? record.EntityId : null,
            actor = record.Actor, actorDisplayName = record.ActorDisplayName, ipAddress = record.IpAddress, userAgent = record.UserAgent,
            correlationId = record.CorrelationId, outcome = record.Outcome
        });
        return writer.AppendAsync(id, record.EventName, payload, occurred, ct);
    }
}
