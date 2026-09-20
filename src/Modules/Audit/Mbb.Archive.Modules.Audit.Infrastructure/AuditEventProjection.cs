using System.Text.Json;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Audit.Infrastructure;

public static class AuditEventProjection
{
    public static AuditEventDetails Project(AuditEntry entry)
    {
        using var payload = JsonDocument.Parse(entry.Payload);
        string? Get(string key) => payload.RootElement.TryGetProperty(key, out var value)
            && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
        var type = Get("entityType");
        var id = Get("entityId");
        if (entry.DocumentId is { } documentId) { type = "document"; id = documentId.ToString(); }
        else if (type is null && Get("folderId") is { } folderId) { type = "folder"; id = folderId; }
        else if (type is null && Get("dossierId") is { } dossierId) { type = "dossier"; id = dossierId; }
        var resource = Resource(type, id);
        return new(entry.Sequence, entry.MessageId, entry.EventName, entry.DocumentId,
            entry.OccurredAt, entry.ReceivedAt, entry.PreviousHash, entry.EntryHash,
            Get("actor"), Get("entityType"), Get("entityId"), Get("outcome"),
            Get("ipAddress"), Get("correlationId"), Get("actorDisplayName"), resource.Type, resource.Id);
    }

    // Older middleware records used paths rather than resource identifiers.
    private static (string? Type, string? Id) Resource(string? type, string? id)
    {
        if (type != "request" || id is null) return (type, id);
        var parts = id.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 4 || parts[0] != "api" || parts[1] != "v1") return (type, id);
        if (parts.Length >= 5 && parts[2] == "documents" && parts[3] == "dossiers" && Guid.TryParse(parts[4], out _))
            return ("dossier", parts[4]);
        if (parts.Length >= 5 && parts[2] == "physical-archive" && parts[3] == "folders" && Guid.TryParse(parts[4], out _))
            return ("folder", parts[4]);
        if (Guid.TryParse(parts[3], out _) && parts[2] is "documents" or "collections")
            return (parts[2] == "documents" ? "document" : "collection", parts[3]);
        return (type, id);
    }
}
