using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.UnitTests;

[TestClass]
public sealed class ProcessingJobTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 8, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void Pdf_IsRoutedToPdfInspection()
    {
        var job = Create("application/pdf");

        job.QueueInitialStage(Now);

        Assert.AreEqual(
            ProcessingStage.PdfInspectionRequested,
            job.Stage);
    }

    [TestMethod]
    public void Tiff_IsRoutedDirectlyToOcr()
    {
        var job = Create("image/tiff");

        job.QueueInitialStage(Now);

        Assert.AreEqual(
            ProcessingStage.OcrRequested,
            job.Stage);
    }

    [TestMethod]
    public void UnsupportedMime_IsExplicitlyMarkedUnsupported()
    {
        var job = Create("application/zip");

        job.QueueInitialStage(Now);

        Assert.AreEqual(
            ProcessingStage.Unsupported,
            job.Stage);
    }

    private static ProcessingJob Create(string mimeType)
        => ProcessingJob.Create(
            Guid.CreateVersion7(),
            Guid.CreateVersion7(),
            "originals/sha256/aa/bb/hash",
            new string('a', 64),
            mimeType,
            Now);

    [TestMethod]
    public void PdfWithoutText_IsRoutedToOcrAfterInspection()
    {
        var job = Create("application/pdf"); job.QueueInitialStage(Now); var requires = job.ApplyPdfInspection(4, "%PDF-1.7", false, true);
        Assert.IsTrue(requires); Assert.AreEqual(ProcessingStage.OcrRequested, job.Stage);
    }

    [TestMethod]
    public void PdfWithText_IsReadyForIndexAfterInspection()
    {
        var job = Create("application/pdf"); job.QueueInitialStage(Now); var requires = job.ApplyPdfInspection(2, "%PDF-1.7", true, false);
        Assert.IsFalse(requires); Assert.AreEqual(ProcessingStage.AwaitingIndex, job.Stage);
    }

    [TestMethod]
    [DataRow("application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [DataRow("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    [DataRow("application/vnd.openxmlformats-officedocument.presentationml.presentation")]
    [DataRow("application/msword")]
    [DataRow("application/vnd.ms-excel")]
    [DataRow("application/vnd.ms-powerpoint")]
    [DataRow("application/vnd.ms-outlook")]
    [DataRow("message/rfc822")]
    [DataRow("text/plain")]
    [DataRow("text/csv")]
    public void TextBearingFormats_AreRoutedToTextExtraction(string mimeType)
    {
        var job = Create(mimeType);

        job.QueueInitialStage(Now);

        Assert.AreEqual(ProcessingStage.TextExtractionRequested, job.Stage);
    }

    [TestMethod]
    public void TextExtractionResult_MovesJobToIndexing()
    {
        var job = Create("text/plain");
        job.QueueInitialStage(Now);

        job.ApplyTextExtraction("plain-text/1.0.0", 1, [Artifact(job)]);

        Assert.AreEqual(ProcessingStage.AwaitingIndex, job.Stage);
        Assert.AreEqual(1, job.Artifacts.Count);
    }

    /// <summary>
    /// Metin çıkarma OCR değildir; güven skoru üretmemelidir.
    /// </summary>
    [TestMethod]
    public void TextExtractionResult_DoesNotClaimOcrConfidence()
    {
        var job = Create("text/plain");
        job.QueueInitialStage(Now);

        job.ApplyTextExtraction("plain-text/1.0.0", 1, [Artifact(job)]);

        Assert.IsNull(job.OcrAverageConfidence);
    }

    [TestMethod]
    public void TextExtractionResult_IsRejectedForAnOcrJob()
    {
        var job = Create("image/png");
        job.QueueInitialStage(Now);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => job.ApplyTextExtraction("plain-text/1.0.0", 1, [Artifact(job)]));
    }

    [TestMethod]
    public void CompletedPdf_ReprocessingPreservesOriginalAndPreviousArtifacts()
    {
        var job = Create("application/pdf");
        job.QueueInitialStage(Now);
        job.ApplyPdfInspection(1, "%PDF-1.7", true, false, [Artifact(job)]);
        job.MarkIndexed(Now);
        var original = job.OriginalStorageKey;
        var revision = job.ConcurrencyVersion;
        job.ReprocessCompletedPdf(Now.AddMinutes(1));
        Assert.AreEqual(ProcessingStage.PdfInspectionRequested, job.Stage);
        Assert.AreEqual(original, job.OriginalStorageKey);
        Assert.AreEqual(1, job.Artifacts.Count);
        Assert.IsNull(job.CompletedAt);
        Assert.IsTrue(job.ConcurrencyVersion > revision);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => job.ReprocessCompletedPdf(Now));
    }

    [TestMethod]
    public void PdfWithNativeTextAndImages_StillRequestsOcr()
    {
        var job = Create("application/pdf");
        job.QueueInitialStage(Now);
        Assert.IsTrue(job.ApplyPdfInspection(7, "%PDF-1.7", true, true));
        Assert.AreEqual(ProcessingStage.OcrRequested, job.Stage);
    }

    [TestMethod]
    public void Reprocess_RejectsNonPdfAndUnfinishedJobs()
    {
        var job = Create("application/pdf");
        job.QueueInitialStage(Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => job.ReprocessCompletedPdf(Now));
        var text = Create("text/plain");
        text.QueueInitialStage(Now);
        text.ApplyTextExtraction("native", 1, []);
        text.MarkIndexed(Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => text.ReprocessCompletedPdf(Now));
    }

    private static ProcessingArtifact Artifact(ProcessingJob job)
        => job.CreateArtifact(
            ProcessingArtifactType.ExtractedText,
            "artifacts/sha256/aa/bb/hash.txt",
            "text/plain",
            new string('b', 64),
            128,
            Now);
}
