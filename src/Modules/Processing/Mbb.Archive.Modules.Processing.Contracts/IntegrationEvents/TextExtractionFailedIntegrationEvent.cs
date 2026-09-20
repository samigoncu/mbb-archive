using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record TextExtractionFailedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string FailureCode,
    string FailureDetail,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.text-extraction-failed.v1";
}
