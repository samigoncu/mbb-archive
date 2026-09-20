namespace Mbb.Archive.Modules.Processing.Domain.Jobs;

public enum ProcessingStage
{
    Queued = 0,
    PdfInspectionRequested = 1,
    OcrRequested = 2,
    AwaitingIndex = 3,
    AwaitingQualityControl = 4,
    Completed = 5,
    Failed = 6,
    Unsupported = 7,
    TextExtractionRequested = 8
}
