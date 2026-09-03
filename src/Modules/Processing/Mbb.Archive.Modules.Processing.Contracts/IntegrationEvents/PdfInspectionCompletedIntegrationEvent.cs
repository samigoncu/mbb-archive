using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record PdfInspectionCompletedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    int PageCount,
    string PdfVersion,
    bool IsEncrypted,
    bool HasEmbeddedText,
    bool RequiresOcr,
    long ExtractedCharacterCount,
    string Engine,
    string EngineVersion,
    // Gömülü metin katmanı olan PDF'lerde OCR çalışmaz; aranabilir metin
    // doğrudan çıkarılır ve bu artifact'larla taşınır.
    ProcessingArtifactDescriptor? TextArtifact,
    ProcessingArtifactDescriptor? JsonArtifact,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.pdf-inspection-completed.v1";
}
