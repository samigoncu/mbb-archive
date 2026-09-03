using Microsoft.VisualStudio.TestTools.UnitTesting;
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
}
