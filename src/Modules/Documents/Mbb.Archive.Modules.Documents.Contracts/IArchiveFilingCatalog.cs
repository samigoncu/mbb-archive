namespace Mbb.Archive.Modules.Documents.Contracts;

// Validates cross-context links without sharing a DbContext.
public interface IArchiveFilingCatalog
{
    Task<FilingDossier?> GetDossierAsync(Guid id, CancellationToken ct);
    Task<FilingDocument?> GetDocumentAsync(Guid id, CancellationToken ct);
    Task<Guid?> GetDocumentVersionIdAsync(Guid id, int versionNumber, CancellationToken ct);
}
public sealed record FilingDossier(Guid Id, Guid OwnerUnitId, string FilePlanCode);
public sealed record FilingDocument(Guid Id, Guid? OwnerUnitId, string? FilePlanCode, Guid? DossierId, Guid? LatestVersionId = null);
