using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentFilePromotionRequestedIntegrationEvent(
    Guid EventId,
    Guid IngestionId,
    Guid DocumentId,
    string StagingStorageKey,
    string Sha256Hash,
    long SizeBytes,
    string DetectedMimeType,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.file-promotion-requested.v1";
}
