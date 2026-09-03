using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.PromoteFile;

public sealed record PromoteDocumentFileCommand(
    Guid MessageId,
    string EventName,
    Guid IngestionId,
    Guid DocumentId) : ICommand;
