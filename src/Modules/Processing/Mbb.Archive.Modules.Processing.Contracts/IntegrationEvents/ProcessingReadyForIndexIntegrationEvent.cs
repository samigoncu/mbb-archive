using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record ProcessingReadyForIndexIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string? TextArtifactStorageKey,
    string? OcrJsonArtifactStorageKey,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.ready-for-index.v1";
}
