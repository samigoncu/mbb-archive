using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record OcrCompletedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string Engine,
    string EngineVersion,
    string Languages,
    int PageCount,
    double AverageConfidence,
    ProcessingArtifactDescriptor TextArtifact,
    ProcessingArtifactDescriptor JsonArtifact,
    ProcessingArtifactDescriptor? SearchablePdfArtifact,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.ocr-completed.v1";
}
