namespace Mbb.Archive.Modules.Retention.Contracts;

/// <summary>Host adapter supplies only originals and metadata visible to the current user.</summary>
public interface IArchiveTransferSource
{
    Task<ArchiveTransferSourceDocument?> GetAsync(Guid documentId, CancellationToken cancellationToken);
    Task<Stream?> OpenOriginalAsync(Guid documentId, Guid versionId, CancellationToken cancellationToken);
}

public sealed record ArchiveTransferSourceDocument(Guid DocumentId, string Title, string MetadataJson,
    IReadOnlyList<ArchiveTransferSourceVersion> Versions);
public sealed record ArchiveTransferSourceVersion(Guid VersionId, int VersionNumber, string MimeType,
    long SizeBytes, string Sha256Hash);
