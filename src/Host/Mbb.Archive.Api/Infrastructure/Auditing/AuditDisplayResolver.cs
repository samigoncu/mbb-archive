using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.Collections.Application.Collections;

namespace Mbb.Archive.Api.Infrastructure.Auditing;

internal sealed class AuditDisplayResolver(
    IDocumentQueries documents, IDossierQueries dossiers, IPhysicalArchiveQueries folders,
    CollectionQueryHandlers collections, ICurrentUserScope scopes, ICurrentUserPermissions permissions,
    IHttpContextAccessor http, IHostEnvironment environment, IOptions<ArchiveAuthenticationOptions> options)
    : IAuditDisplayResolver
{
    public async Task<AuditResourceDisplay?> ResolveResourceAsync(string entityType, string entityId, CancellationToken ct)
    {
        if (!Guid.TryParse(entityId, out var id)) return null;
        var grants = await permissions.GetAsync(ct);
        var all = await permissions.HasAllPermissionsAsync(ct);
        bool Has(string permission) => all || grants.Contains(permission, StringComparer.OrdinalIgnoreCase);
        // Audit permission alone must not reveal names of otherwise inaccessible records.
        switch (entityType)
        {
            case "document" when Has("documents.read"):
                var document = await documents.GetByIdAsync(id, await scopes.GetAsync(ct), ct);
                return document is null ? null : new(document.Title, $"/documents/{id}");
            case "dossier" when Has("documents.read"):
                var dossier = await dossiers.GetAsync(id, ct);
                return dossier is null ? null : new($"{dossier.FilePlanCode} · {dossier.Year} · {dossier.Title}",
                    $"/documents?ownerUnitId={dossier.OwnerUnitId}&dossierId={id}");
            case "folder" when Has("physical-archive.read"):
                var folder = await folders.GetFolderAsync(id, ct);
                return folder is null ? null : new($"{folder.Barcode} · {folder.Title}", $"/dosya-islemleri/{id}");
            case "collection" when Has("collections.read"):
                var collection = await collections.Handle(new GetCollectionQuery(id), ct);
                return collection.IsFailure ? null : new(collection.Value.Name, $"/koleksiyonlar/{id}");
            default: return null;
        }
    }

    public string? ResolveActorName(string actor)
    {
        var user = http.HttpContext?.User;
        if (user is not null && AccessAuditIdentity.Subject(user) == actor
            && AccessAuditIdentity.DisplayName(user) is { } name) return name;
        if (environment.IsDevelopment() && !options.Value.Enabled && actor == options.Value.DevelopmentSubject)
            return $"{actor} (geliştirme hesabı)";
        return null;
    }
}
