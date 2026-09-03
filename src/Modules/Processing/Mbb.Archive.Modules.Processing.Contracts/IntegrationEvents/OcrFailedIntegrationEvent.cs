using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record OcrFailedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string FailureCode,
    string FailureDetail,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.ocr-failed.v1";
}
