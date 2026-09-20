using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Retention.Contracts;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class ArchiveTransferSource(IDocumentRepository documents, ICurrentUserScope scope,
    IOriginalObjectStorage originals, IClassificationExportReader metadata) : IArchiveTransferSource
{
    private async Task<Document?> VisibleAsync(Guid id, CancellationToken ct)
    {
        var record = await documents.GetByIdAsync(new DocumentId(id), ct);
        if (record is null || !DocumentAccessFilter.Allows(await scope.GetAsync(ct), id, record.OwnerUnitPath, record.FilePlanCode)) return null;
        return record;
    }

    public async Task<ArchiveTransferSourceDocument?> GetAsync(Guid documentId, CancellationToken cancellationToken)
    {
        var record = await VisibleAsync(documentId, cancellationToken);
        if (record is null) return null;
        var snapshot = JsonSerializer.Serialize(new
        {
            record.Title, record.Status, record.CreatedAt, record.ArchivedAt, record.OwnerUnitId, record.OwnerUnitPath,
            record.FilePlanCode, record.DossierId, record.CurrentVersionNumber, record.ConcurrencyVersion,
            metadata = JsonSerializer.Deserialize<JsonElement>(await metadata.ReadMetadataJsonAsync(documentId, cancellationToken)),
            versions = record.Versions.OrderBy(x => x.VersionNumber).Select(x => new { x.Id, x.VersionNumber,
                x.CreatedAt, x.CreatedBy, x.Reason, x.Sha256Hash, x.CancelledAt, x.CancelledBy, x.CancellationReason })
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new(documentId, record.Title, snapshot, record.Versions.OrderBy(x => x.VersionNumber)
            .Select(x => new ArchiveTransferSourceVersion(x.Id, x.VersionNumber, x.MimeType, x.SizeBytes, x.Sha256Hash)).ToArray());
    }

    public async Task<Stream?> OpenOriginalAsync(Guid documentId, Guid versionId, CancellationToken cancellationToken)
    {
        var record = await VisibleAsync(documentId, cancellationToken);
        var version = record?.Versions.SingleOrDefault(x => x.Id == versionId);
        return version is null ? null : await originals.OpenReadVersionAsync(version.StorageKey, version.StorageVersionId, cancellationToken);
    }
}
