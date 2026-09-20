using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

/// <summary>
/// Office/metin formatlarından çıkarılan aranabilir metnin sonucu. OCR'dan
/// farklı olarak güven skoru taşımaz; içerik zaten metin katmanındadır.
/// </summary>
public sealed record TextExtractionCompletedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string Engine,
    string EngineVersion,
    int PageCount,
    int CharacterCount,
    ProcessingArtifactDescriptor TextArtifact,
    DateTimeOffset OccurredAt,
    ProcessingArtifactDescriptor? PdfArtifact = null,
    ProcessingArtifactDescriptor? JsonArtifact = null,
    double? AverageConfidence = null,
    string? Languages = null) : IIntegrationEvent
{
    public string EventName => "processing.text-extraction-completed.v1";
}
