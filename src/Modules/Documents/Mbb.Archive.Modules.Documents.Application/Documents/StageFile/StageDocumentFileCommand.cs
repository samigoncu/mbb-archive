using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.StageFile;

public sealed record StageDocumentFileCommand(
    Guid DocumentId,
    string OriginalFileName,
    string ClientContentType,
    long DeclaredSizeBytes,
    Stream Content,
    string SubmittedBy,
    string? VersionReason)
    : ICommand<StageDocumentFileResponse>;

public sealed record StageDocumentFileResponse(
    Guid IngestionId,
    Guid DocumentId,
    string Status,
    string Sha256Hash,
    long SizeBytes);
