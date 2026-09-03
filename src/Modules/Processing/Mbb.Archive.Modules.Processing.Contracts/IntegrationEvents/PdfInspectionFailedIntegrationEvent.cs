using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record PdfInspectionFailedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string FailureCode,
    string FailureDetail,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.pdf-inspection-failed.v1";
}
