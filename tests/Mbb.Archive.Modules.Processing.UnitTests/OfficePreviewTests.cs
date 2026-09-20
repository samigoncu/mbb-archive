using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Application.Previews;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.UnitTests;

[TestClass]
public sealed class OfficePreviewTests
{
    [TestMethod]
    public void OfficeResult_RecordsDerivedPdfAndOcrWithoutReplacingOriginal()
    {
        var f = new Fixture(); var original = f.Job.OriginalStorageKey;
        f.Complete();
        Assert.AreEqual(original, f.Job.OriginalStorageKey);
        Assert.AreEqual(ProcessingStage.AwaitingIndex, f.Job.Stage);
        Assert.AreEqual(3, f.Job.Artifacts.Count);
        Assert.AreEqual(0.9, f.Job.OcrAverageConfidence);
    }
    [TestMethod]
    public void OfficeResult_RejectsMissingPdf()
    {
        var f = new Fixture();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => f.Job.ApplyOfficeRendering("engine", "tur", 1, 0.9, []));
    }
    [TestMethod]
    public async Task InvisibleDocument_CannotReadDerivedPdfOrStatus()
    {
        var f = new Fixture { Visible = false }; f.Complete();
        Assert.AreEqual(ErrorType.NotFound, (await f.Handler.GetStateAsync(f.Job.DocumentId, default)).Error.Type);
        Assert.AreEqual(ErrorType.NotFound, (await f.Handler.OpenAsync(f.Job.DocumentId, default)).Error.Type);
        Assert.AreEqual(0, f.StorageReads);
    }
    [TestMethod]
    public async Task PendingOffice_DoesNotExposeAnOriginalAsPdf()
    {
        var f = new Fixture();
        Assert.AreEqual("Pending", (await f.Handler.GetStateAsync(f.Job.DocumentId, default)).Value.Status);
        Assert.IsTrue((await f.Handler.OpenAsync(f.Job.DocumentId, default)).IsFailure);
        Assert.AreEqual(0, f.StorageReads);
    }
    [TestMethod]
    public async Task ReadyOffice_StreamsOnlyItsDerivedArtifact()
    {
        var f = new Fixture(); f.Complete();
        Assert.AreEqual("Ready", (await f.Handler.GetStateAsync(f.Job.DocumentId, default)).Value.Status);
        using var stream = (await f.Handler.OpenAsync(f.Job.DocumentId, default)).Value;
        Assert.AreEqual("artifacts/preview.pdf", f.ReadKey);
        Assert.AreEqual(f.Job.DocumentVersionId, f.RequestedVersion);
    }
    [TestMethod]
    public async Task HistoricalVersion_ReadsItsPdfEvenWhenLatestVersionIsDifferent()
    {
        var f = new Fixture { LatestVersionOverride = Guid.NewGuid() }; f.Complete();
        using var stream = (await f.Handler.OpenAsync(f.Job.DocumentId, default, 1)).Value;
        Assert.AreEqual(f.Job.DocumentVersionId, f.RequestedVersion);
        Assert.AreEqual("Ready", (await f.Handler.GetStateAsync(f.Job.DocumentId, default, 1)).Value.Status);
    }
    [TestMethod]
    public async Task MissingHistoricalVersion_DoesNotFallBackToLatestPdf()
    {
        var f = new Fixture(); f.Complete();
        Assert.IsTrue((await f.Handler.OpenAsync(f.Job.DocumentId, default, 99)).IsFailure);
        Assert.IsTrue((await f.Handler.GetStateAsync(f.Job.DocumentId, default, 99)).IsFailure);
        Assert.AreEqual(0, f.StorageReads);
    }
    [TestMethod]
    public async Task HistoricalPreview_StillRequiresVisibilityAndValidVersion()
    {
        var f = new Fixture { Visible = false }; f.Complete();
        Assert.IsTrue((await f.Handler.OpenAsync(f.Job.DocumentId, default, 1)).IsFailure);
        Assert.IsTrue((await f.Handler.GetStateAsync(f.Job.DocumentId, default, 1)).IsFailure);
        Assert.AreEqual(0, f.StorageReads);
        Assert.AreEqual("processing.invalid_version", (await f.Handler.GetStateAsync(f.Job.DocumentId, default, 0)).Error.Code);
    }
    private sealed class Fixture : IArchiveFilingCatalog, IProcessingJobRepository, IPreviewArtifactStore
    {
        public bool Visible = true;
        public int StorageReads;
        public string? ReadKey;
        public Guid? RequestedVersion;
        public Guid? LatestVersionOverride;
        public ProcessingJob Job { get; } = ProcessingJob.Create(Guid.NewGuid(), Guid.NewGuid(), "originals/test.odt", new string('a', 64), "application/vnd.oasis.opendocument.text", DateTimeOffset.UtcNow);
        public DocumentPreviewHandler Handler => new(this, this, this);
        public Fixture() => Job.QueueInitialStage(DateTimeOffset.UtcNow);
        public void Complete() => Job.ApplyOfficeRendering("LibreOffice+Tesseract", "tur+eng", 1, 0.9,
            [Artifact(ProcessingArtifactType.ExtractedText, "text/plain", "text.txt"), Artifact(ProcessingArtifactType.OcrJson, "application/json", "ocr.json"), Artifact(ProcessingArtifactType.PdfNormalized, "application/pdf", "preview.pdf")]);
        private ProcessingArtifact Artifact(ProcessingArtifactType type, string mime, string file) => Job.CreateArtifact(type, "artifacts/" + file, mime, new string('b', 64), 50, DateTimeOffset.UtcNow);
        public Task<FilingDocument?> GetDocumentAsync(Guid id, CancellationToken ct) => Task.FromResult<FilingDocument?>(Visible ? new(id, Guid.NewGuid(), null, null, LatestVersionOverride ?? Job.DocumentVersionId) : null);
        public Task<Guid?> GetDocumentVersionIdAsync(Guid id, int versionNumber, CancellationToken ct)
            => Task.FromResult<Guid?>(Visible && id == Job.DocumentId && versionNumber == 1 ? Job.DocumentVersionId : null);
        public Task<FilingDossier?> GetDossierAsync(Guid id, CancellationToken ct) => Task.FromResult<FilingDossier?>(null);
        public Task<ProcessingJob?> GetByDocumentVersionIdAsync(Guid id, CancellationToken ct) { RequestedVersion = id; return Task.FromResult<ProcessingJob?>(id == Job.DocumentVersionId ? Job : null); }
        public Task<ProcessingJob?> GetByIdAsync(ProcessingJobId id, CancellationToken ct) => Task.FromResult<ProcessingJob?>(Job);
        public Task<bool> ExistsForVersionAsync(Guid id, CancellationToken ct) => Task.FromResult(true);
        public Task<IReadOnlyList<ProcessingJob>> GetAwaitingIndexJobsByDocumentIdAsync(Guid documentId, CancellationToken ct) => Task.FromResult<IReadOnlyList<ProcessingJob>>([]);
        public Task AddAsync(ProcessingJob job, CancellationToken ct) => throw new NotSupportedException();
        public Task<Stream?> OpenReadAsync(string key, CancellationToken ct) { StorageReads++; ReadKey = key; return Task.FromResult<Stream?>(new MemoryStream("%PDF-1.7"u8.ToArray())); }
    }
}
