using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Application.Projection;

public sealed record ApplyProcessingReadyCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    Guid DocumentVersionId,
    string? TextArtifactStorageKey,
    string? OcrJsonArtifactStorageKey,
    DateTimeOffset OccurredAt,
    string? MimeType = null) : ICommand;
