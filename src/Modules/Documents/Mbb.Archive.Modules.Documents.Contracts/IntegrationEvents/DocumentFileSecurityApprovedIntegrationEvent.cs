using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentFileSecurityApprovedIntegrationEvent(
    Guid EventId,
    Guid SourceMessageId,
    Guid IngestionId,
    Guid DocumentId,
    string DetectedMimeType,
    string ScannerEngine,
    string ScannerVersion,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.file-security-approved.v1";
}
