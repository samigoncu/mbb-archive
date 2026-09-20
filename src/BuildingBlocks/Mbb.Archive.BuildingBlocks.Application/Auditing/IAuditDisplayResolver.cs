namespace Mbb.Archive.BuildingBlocks.Application.Auditing;

/// <summary>Resolves current names through each module's authorized query API, without generating a new access event.</summary>
public interface IAuditDisplayResolver
{
    Task<AuditResourceDisplay?> ResolveResourceAsync(string entityType, string entityId, CancellationToken ct);
    string? ResolveActorName(string actor);
}

public sealed record AuditResourceDisplay(string Name, string? Url);
