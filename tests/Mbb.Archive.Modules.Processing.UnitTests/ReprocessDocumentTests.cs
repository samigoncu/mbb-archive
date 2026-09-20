using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Application.Jobs.Reprocess;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.UnitTests;

[TestClass]
public sealed class ReprocessDocumentTests
{
    [TestMethod]
    [DataRow("image/png", ProcessingStage.OcrRequested)]
    [DataRow("image/jpeg", ProcessingStage.OcrRequested)]
    [DataRow("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ProcessingStage.TextExtractionRequested)]
    [DataRow("text/plain", ProcessingStage.TextExtractionRequested)]
    public void FailedSupportedFilesReturnToCorrectWorkerWithoutChangingOriginal(string mime, ProcessingStage expected)
    {
        var job = ProcessingJob.Create(Guid.NewGuid(), Guid.NewGuid(), "original-key", new string('a', 64), mime, DateTimeOffset.UtcNow);
        job.QueueInitialStage(DateTimeOffset.UtcNow); job.MarkFailed("worker.failed", "Failure"); var version = job.ConcurrencyVersion;
        job.Reprocess(DateTimeOffset.UtcNow); Assert.AreEqual(expected, job.Stage); Assert.AreEqual("original-key", job.OriginalStorageKey);
        Assert.IsTrue(job.ConcurrencyVersion > version); Assert.IsNull(job.FailureCode);
    }
    [TestMethod]
    public async Task StaleJobIdCannotReprocessAnotherVersion()
    {
        var f = new Fixture(); var result = await f.Handler.Handle(f.Job.DocumentId, default, Guid.NewGuid());
        Assert.AreEqual(ErrorType.Conflict, result.Error.Type); Assert.AreEqual(0, f.Events.Count); Assert.AreEqual(ProcessingStage.Completed, f.Job.Stage);
    }
    [TestMethod]
    [DataRow("image/png", "processing.ocr-requested.v1")]
    [DataRow("text/plain", "processing.text-extraction-requested.v1")]
    public async Task RetryPublishesTheCorrectWorkerContract(string mime, string eventName)
    {
        var f = new Fixture(mime); var result = await f.Handler.Handle(f.Job.DocumentId, default, f.Job.Id.Value);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(eventName, f.Events.Single().EventName); Assert.AreEqual(1, f.Saves);
    }
    [TestMethod]
    public void UnsupportedMimeAndInFlightJobsAreRejected()
    {
        var job = ProcessingJob.Create(Guid.NewGuid(), Guid.NewGuid(), "key", new string('a', 64), "application/zip", DateTimeOffset.UtcNow);
        job.QueueInitialStage(DateTimeOffset.UtcNow); Assert.ThrowsExactly<Mbb.Archive.BuildingBlocks.Domain.DomainRuleViolationException>(() => job.Reprocess(DateTimeOffset.UtcNow));
    }
    [TestMethod]
    public void FailedPdfCanRetryWithoutUploadingTheOriginalAgain()
    {
        var job = ProcessingJob.Create(Guid.NewGuid(), Guid.NewGuid(), "originals/large.pdf", new string('a', 64), "application/pdf", DateTimeOffset.UtcNow);
        job.QueueInitialStage(DateTimeOffset.UtcNow);
        job.MarkFailed("pdf_inspection_failed", "Image stream exceeds parser limit");
        job.ReprocessCompletedPdf(DateTimeOffset.UtcNow);
        Assert.AreEqual(ProcessingStage.PdfInspectionRequested, job.Stage);
        Assert.IsNull(job.FailureCode);
        Assert.AreEqual("originals/large.pdf", job.OriginalStorageKey);
        Assert.ThrowsExactly<Mbb.Archive.BuildingBlocks.Domain.DomainRuleViolationException>(() => job.ReprocessCompletedPdf(DateTimeOffset.UtcNow));
    }

    [TestMethod]
    public async Task InvisibleDocument_DoesNotQueueProcessing()
    {
        var f = new Fixture { Visible = false };
        var result = await f.Handler.Handle(f.Job.DocumentId, default);
        Assert.AreEqual(ErrorType.NotFound, result.Error.Type);
        Assert.AreEqual(0, f.Events.Count);
    }

    [TestMethod]
    public async Task ReadOnlyUnit_DoesNotQueueProcessing()
    {
        var f = new Fixture { Writable = false };
        var result = await f.Handler.Handle(f.Job.DocumentId, default);
        Assert.AreEqual(ErrorType.Forbidden, result.Error.Type);
        Assert.AreEqual(ProcessingStage.Completed, f.Job.Stage);
        Assert.AreEqual(0, f.Events.Count);
    }

    [TestMethod]
    public async Task LatestVersion_QueuesOneInspectionAndRejectsSecondRequest()
    {
        var f = new Fixture();
        var result = await f.Handler.Handle(f.Job.DocumentId, default);
        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(f.Job.DocumentVersionId, f.RequestedVersion);
        var request = (PdfInspectionRequestedIntegrationEvent)f.Events.Single();
        Assert.AreEqual(f.Job.OriginalStorageKey, request.OriginalStorageKey);
        Assert.AreEqual(1, f.Saves);
        var duplicate = await f.Handler.Handle(f.Job.DocumentId, default);
        Assert.AreEqual(ErrorType.Conflict, duplicate.Error.Type);
        Assert.AreEqual(1, f.Events.Count);
    }

    private sealed class Fixture : IArchiveFilingCatalog, IArchiveUnitDirectory,
        IProcessingJobRepository, IOutbox<ProcessingBoundary>, IUnitOfWork<ProcessingBoundary>
    {
        public bool Visible = true, Writable = true;
        public int Saves;
        public Guid? RequestedVersion;
        public readonly Guid Unit = Guid.NewGuid();
        public readonly List<IIntegrationEvent> Events = [];
        public ProcessingJob Job { get; }
        public ReprocessDocumentHandler Handler => new(this, this, this, this, this, TimeProvider.System);
        public Fixture(string mime = "application/pdf")
        {
            Job = ProcessingJob.Create(Guid.NewGuid(), Guid.NewGuid(), "originals/test.pdf", new string('a', 64), mime, DateTimeOffset.UtcNow);
            Job.QueueInitialStage(DateTimeOffset.UtcNow);
            if (mime == "application/pdf") { Job.ApplyPdfInspection(1, "%PDF-1.7", true, false); Job.MarkIndexed(DateTimeOffset.UtcNow); }
            else Job.MarkFailed("worker.failed", "Retry required");
        }
        public Task<FilingDocument?> GetDocumentAsync(Guid id, CancellationToken ct) => Task.FromResult<FilingDocument?>(Visible ? new(id, Unit, null, null, Job.DocumentVersionId) : null);
        public Task<Guid?> GetDocumentVersionIdAsync(Guid id, int versionNumber, CancellationToken ct)
            => Task.FromResult<Guid?>(Visible && id == Job.DocumentId && versionNumber == 1 ? Job.DocumentVersionId : null);
        public Task<FilingDossier?> GetDossierAsync(Guid id, CancellationToken ct) => Task.FromResult<FilingDossier?>(null);
        public Task<IReadOnlyList<ArchiveUnit>> GetVisibleAsync(CancellationToken ct) => Task.FromResult<IReadOnlyList<ArchiveUnit>>([]);
        public Task<ArchiveUnit?> ResolveWritableAsync(Guid? unitId, string permission, CancellationToken ct) => Task.FromResult<ArchiveUnit?>(Writable && unitId == Unit ? new(Unit, "Unit", "/Unit/", null, true, true, true, true) : null);
        public Task<ProcessingJob?> GetByDocumentVersionIdAsync(Guid id, CancellationToken ct) { RequestedVersion = id; return Task.FromResult<ProcessingJob?>(id == Job.DocumentVersionId ? Job : null); }
        public Task<ProcessingJob?> GetByIdAsync(ProcessingJobId id, CancellationToken ct) => Task.FromResult<ProcessingJob?>(Job);
        public Task<bool> ExistsForVersionAsync(Guid id, CancellationToken ct) => Task.FromResult(true);
        public Task<IReadOnlyList<ProcessingJob>> GetAwaitingIndexJobsByDocumentIdAsync(Guid documentId, CancellationToken ct) => Task.FromResult<IReadOnlyList<ProcessingJob>>([]);
        public Task AddAsync(ProcessingJob job, CancellationToken ct) => throw new NotSupportedException();
        public void Enqueue(IIntegrationEvent e) => Events.Add(e);
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
    }
}
