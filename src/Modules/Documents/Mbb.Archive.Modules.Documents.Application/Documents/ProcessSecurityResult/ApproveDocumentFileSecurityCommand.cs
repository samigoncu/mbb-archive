using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;

public sealed record ApproveDocumentFileSecurityCommand(
    Guid MessageId,
    Guid IngestionId,
    Guid DocumentId,
    string EventName,
    string DetectedMimeType,
    string ScannerEngine,
    string ScannerVersion,
    DateTimeOffset ScannedAt) : ICommand;
