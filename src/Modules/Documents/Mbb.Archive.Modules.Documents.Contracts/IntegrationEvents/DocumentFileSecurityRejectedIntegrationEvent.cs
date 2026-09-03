using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentFileSecurityRejectedIntegrationEvent(
    Guid EventId,
    Guid SourceMessageId,
    Guid IngestionId,
    Guid DocumentId,
    string ReasonCode,
    string Detail,
    string? ThreatName,
    string? DetectedMimeType,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.file-security-rejected.v1";
}
