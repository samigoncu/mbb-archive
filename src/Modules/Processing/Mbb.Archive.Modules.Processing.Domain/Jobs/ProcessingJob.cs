using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;

namespace Mbb.Archive.Modules.Processing.Domain.Jobs;

public sealed class ProcessingJob : AggregateRoot<ProcessingJobId>
{
    private readonly List<ProcessingArtifact> _artifacts = [];

    private ProcessingJob()
    {
    }

    private ProcessingJob(
        ProcessingJobId id,
        Guid documentId,
        Guid documentVersionId,
        string originalStorageKey,
        string sha256Hash,
        string mimeType,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");

        if (documentVersionId == Guid.Empty)
            throw new DomainRuleViolationException("Document version id is required.");

        if (string.IsNullOrWhiteSpace(originalStorageKey))
            throw new DomainRuleViolationException("Original storage key is required.");

        if (string.IsNullOrWhiteSpace(sha256Hash) || sha256Hash.Length != 64)
            throw new DomainRuleViolationException("SHA-256 hash is required.");

        if (string.IsNullOrWhiteSpace(mimeType))
            throw new DomainRuleViolationException("MIME type is required.");

        DocumentId = documentId;
        DocumentVersionId = documentVersionId;
        OriginalStorageKey = originalStorageKey.Trim();
        Sha256Hash = sha256Hash.ToLowerInvariant();
        MimeType = mimeType.Trim();
        CreatedAt = createdAt;
        Stage = ProcessingStage.Queued;
        ConcurrencyVersion = 1;
    }

    public Guid DocumentId { get; private set; }
    public Guid DocumentVersionId { get; private set; }
    public string OriginalStorageKey { get; private set; } = string.Empty;
    public string Sha256Hash { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public ProcessingStage Stage { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? FailureCode { get; private set; }
    public string? FailureDetail { get; private set; }
    public int? PdfPageCount { get; private set; }
    public string? PdfVersion { get; private set; }
    public bool? PdfHasEmbeddedText { get; private set; }
    public double? OcrAverageConfidence { get; private set; }
    public int? OcrPageCount { get; private set; }
    public string? OcrEngine { get; private set; }
    public string? OcrLanguages { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public IReadOnlyCollection<ProcessingArtifact> Artifacts =>
        _artifacts.AsReadOnly();

    public static ProcessingJob Create(
        Guid documentId,
        Guid documentVersionId,
        string originalStorageKey,
        string sha256Hash,
        string mimeType,
        DateTimeOffset now)
        => new(
            ProcessingJobId.New(),
            documentId,
            documentVersionId,
            originalStorageKey,
            sha256Hash,
            mimeType,
            now);

    public void QueueInitialStage(DateTimeOffset now)
    {
        if (Stage != ProcessingStage.Queued)
        {
            throw new DomainRuleViolationException(
                "Processing job has already been routed.");
        }

        Stage = MimeType switch
        {
            "application/pdf" => ProcessingStage.PdfInspectionRequested,

            "image/tiff" => ProcessingStage.OcrRequested,
            "image/jpeg" => ProcessingStage.OcrRequested,
            "image/png" => ProcessingStage.OcrRequested,

            // Metin taşıyan formatlar OCR'a değil metin çıkarıcıya gider;
            // içerikleri zaten makine tarafından okunabilir durumdadır.
            _ when TextBearingMimeTypes.Contains(MimeType) =>
                ProcessingStage.TextExtractionRequested,

            _ => ProcessingStage.Unsupported
        };

        StartedAt = now;
        ConcurrencyVersion++;
    }

    public void ReprocessCompletedPdf(DateTimeOffset now)
    {
        if (MimeType != "application/pdf")
            throw new DomainRuleViolationException("Bu işlem yalnız PDF içindir.");
        Reprocess(now);
    }

    public void Reprocess(DateTimeOffset now)
    {
        if (Stage is not (ProcessingStage.Completed or ProcessingStage.Failed))
            throw new DomainRuleViolationException("Yalnız tamamlanmış veya başarısız işlemler yeniden başlatılabilir.");
        if (MimeType is not ("application/pdf" or "image/tiff" or "image/jpeg" or "image/png") && !TextBearingMimeTypes.Contains(MimeType))
            throw new DomainRuleViolationException("Bu dosya biçimi yeniden işlenemiyor.");

        // Keep previous artifacts as evidence until a new result is indexed.
        Stage = ProcessingStage.Queued;
        CompletedAt = null;
        FailureCode = null;
        FailureDetail = null;
        QueueInitialStage(now);
    }

    public bool ApplyPdfInspection(
        int pageCount,
        string pdfVersion,
        bool hasEmbeddedText,
        bool requiresOcr,
        IEnumerable<ProcessingArtifact>? extractedTextArtifacts = null)
    {
        if (Stage != ProcessingStage.PdfInspectionRequested)
        {
            throw new DomainRuleViolationException(
                "PDF inspection result is not expected for the current stage.");
        }

        if (pageCount <= 0)
            throw new DomainRuleViolationException("PDF page count must be positive.");

        PdfPageCount = pageCount;
        PdfVersion = pdfVersion;
        PdfHasEmbeddedText = hasEmbeddedText;

        // Gömülü metin katmanından çıkarılan aranabilir metin, OCR çıktısıyla
        // aynı artifact sözleşmesinde saklanır.
        foreach (var artifact in extractedTextArtifacts ?? [])
            _artifacts.Add(artifact);

        Stage = requiresOcr
            ? ProcessingStage.OcrRequested
            : ProcessingStage.AwaitingIndex;

        ConcurrencyVersion++;
        return requiresOcr;
    }

    /// <summary>
    /// §3.1 kapsamındaki metin taşıyan formatlar. Tür içerik imzasından
    /// belirlenir; uzantı bu karara girmez.
    /// </summary>
    private static readonly HashSet<string> TextBearingMimeTypes =
    [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
        "application/vnd.ms-outlook",
        "message/rfc822",
        "text/plain",
        "text/csv"
    ];

    public void ApplyTextExtraction(
        string engine,
        int pageCount,
        IEnumerable<ProcessingArtifact> artifacts)
    {
        if (Stage != ProcessingStage.TextExtractionRequested)
        {
            throw new DomainRuleViolationException(
                "Text extraction result is not expected for the current stage.");
        }

        if (pageCount <= 0)
        {
            throw new DomainRuleViolationException(
                "Text extraction page count must be positive.");
        }

        // Metin çıkarma OCR değildir; güven skoru üretmez ve OCR alanlarını
        // doldurmaz. Aranabilir metin aynı artifact sözleşmesinde saklanır.
        OcrEngine = engine;
        OcrPageCount = pageCount;

        _artifacts.AddRange(artifacts);

        Stage = ProcessingStage.AwaitingIndex;
        ConcurrencyVersion++;
    }

    public void ApplyOfficeRendering(string engine, string languages, int pageCount,
        double confidence, IEnumerable<ProcessingArtifact> artifacts)
    {
        if (!OfficeDocumentTypes.Contains(MimeType))
            throw new DomainRuleViolationException("Office PDF result is not valid for this document type.");
        var results = artifacts.ToArray();
        if (!results.Any(x => x.Type == ProcessingArtifactType.PdfNormalized && x.MimeType == "application/pdf")
            || !results.Any(x => x.Type == ProcessingArtifactType.OcrJson))
            throw new DomainRuleViolationException("Office PDF and OCR JSON artifacts are required.");
        ApplyTextExtraction(engine, pageCount, results);
        OcrAverageConfidence = Math.Clamp(confidence, 0d, 1d);
        OcrLanguages = languages;
    }

    public static readonly IReadOnlySet<string> OfficeDocumentTypes = new HashSet<string>
    {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
        "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"
    };

    public void ApplyOcrResult(
        string engine,
        string languages,
        int pageCount,
        double averageConfidence,
        IEnumerable<ProcessingArtifact> artifacts)
    {
        if (Stage != ProcessingStage.OcrRequested)
        {
            throw new DomainRuleViolationException(
                "OCR result is not expected for the current stage.");
        }

        if (pageCount <= 0)
            throw new DomainRuleViolationException("OCR page count must be positive.");

        OcrEngine = engine;
        OcrLanguages = languages;
        OcrPageCount = pageCount;
        OcrAverageConfidence = Math.Clamp(averageConfidence, 0d, 1d);

        _artifacts.AddRange(artifacts);

        Stage = ProcessingStage.AwaitingIndex;
        ConcurrencyVersion++;
    }

    public void MarkIndexed(DateTimeOffset completedAt)
    {
        if (Stage == ProcessingStage.Completed)
            return;

        if (Stage != ProcessingStage.AwaitingIndex)
        {
            throw new DomainRuleViolationException(
                "Only a processing job awaiting search indexing can be completed.");
        }

        Stage = ProcessingStage.Completed;
        CompletedAt = completedAt;
        ConcurrencyVersion++;
    }

    public void MarkFailed(
        string failureCode,
        string failureDetail)
    {
        if (Stage == ProcessingStage.Completed)
        {
            throw new DomainRuleViolationException(
                "Completed processing job cannot fail.");
        }

        FailureCode = failureCode;
        FailureDetail = failureDetail;
        Stage = ProcessingStage.Failed;
        ConcurrencyVersion++;
    }

    public ProcessingArtifact CreateArtifact(
        ProcessingArtifactType type,
        string storageKey,
        string mimeType,
        string sha256Hash,
        long sizeBytes,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            Id,
            type,
            storageKey,
            mimeType,
            sha256Hash,
            sizeBytes,
            now);
}
