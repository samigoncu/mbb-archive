using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record OcrRequestedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string OriginalStorageKey,
    string Sha256Hash,
    string MimeType,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.ocr-requested.v1";
}
