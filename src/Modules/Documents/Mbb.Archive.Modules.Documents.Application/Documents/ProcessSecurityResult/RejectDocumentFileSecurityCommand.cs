using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;

public sealed record RejectDocumentFileSecurityCommand(
    Guid MessageId,
    Guid IngestionId,
    Guid DocumentId,
    string EventName,
    string ReasonCode,
    string Detail,
    string? ThreatName,
    string? DetectedMimeType,
    DateTimeOffset ScannedAt) : ICommand;
