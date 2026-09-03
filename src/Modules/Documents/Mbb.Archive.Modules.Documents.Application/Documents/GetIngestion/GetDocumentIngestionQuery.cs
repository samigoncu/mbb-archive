using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;

public sealed record GetDocumentIngestionQuery(
    Guid DocumentId,
    Guid IngestionId)
    : IQuery<DocumentIngestionDetails>;

public sealed record DocumentIngestionDetails(
    Guid Id,
    Guid DocumentId,
    string OriginalFileName,
    string ClientContentType,
    string? DetectedMimeType,
    long DeclaredSizeBytes,
    long? StoredSizeBytes,
    string? Sha256Hash,
    string Status,
    string? SecurityScanner,
    DateTimeOffset? SecurityScannedAt,
    string? RejectionCode,
    string? RejectionDetail,
    string? OriginalStorageKey,
    DateTimeOffset? OriginalStoredAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StagedAt);
