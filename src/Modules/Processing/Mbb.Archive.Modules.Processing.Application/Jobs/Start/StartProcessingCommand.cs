using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Start;

public sealed record StartProcessingCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    Guid DocumentVersionId,
    string OriginalStorageKey,
    string Sha256Hash,
    string MimeType,
    DateTimeOffset OriginalStoredAt) : ICommand<Guid>;
