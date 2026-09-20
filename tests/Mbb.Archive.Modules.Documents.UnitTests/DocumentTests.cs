using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.UnitTests;

[TestClass]
public sealed class DocumentTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 7, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void Create_WithBlankTitle_Throws()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => Document.Create("   ", Now));
    }

    [TestMethod]
    public void Archive_WithoutVersion_Throws()
    {
        var document = Document.Create("Test Document", Now);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => document.Archive(Now.AddMinutes(1)));
    }

    [TestMethod]
    public void Archive_WithVersion_LocksFutureMutation()
    {
        var document = Document.Create("Test Document", Now);

        document.AddVersion(
            "2026/09/02/file.bin",
            new string('a', 64),
            "application/pdf",
            1024,
            "dev-admin",
            null,
            Now.AddMinutes(1));

        document.Archive(Now.AddMinutes(2));

        Assert.AreEqual(DocumentStatus.Archived, document.Status);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => document.ChangeTitle("Changed"));
    }

    [TestMethod]
    public void BeginFileIngestion_IncrementsConcurrencyVersion()
    {
        var document = Document.Create("Initial", Now);
        var before = document.ConcurrencyVersion;

        _ = document.BeginFileIngestion(
            "test.pdf",
            "application/pdf",
            128,
            "dev-admin",
            null,
            Now.AddMinutes(1));

        Assert.AreEqual(before + 1, document.ConcurrencyVersion);
    }

    [TestMethod]
    public void ChangeTitle_IncrementsConcurrencyVersion()
    {
        var document = Document.Create("Initial", Now);
        var before = document.ConcurrencyVersion;

        document.ChangeTitle("Updated");

        Assert.AreEqual(before + 1, document.ConcurrencyVersion);
    }

    [TestMethod]
    public void SecurityApproval_ChangesPendingIngestionToApproved()
    {
        var document = Document.Create("Security test", Now);

        var ingestion = document.BeginFileIngestion("test.pdf", "application/pdf", 512, "dev-admin", null, Now);

        ingestion.MarkStaged(
            "2026/09/02/file.bin",
            new string('a', 64),
            512,
            Now.AddSeconds(1));

        ingestion.MarkSecurityApproved(
            "application/pdf",
            "ClamAV/1.5.4",
            Now.AddSeconds(2));

        Assert.AreEqual(
            DocumentFileIngestionStatus.SecurityApproved,
            ingestion.Status);
    }

    [TestMethod]
    public void SecurityRejection_IsTerminalForApproval()
    {
        var document = Document.Create("Security test", Now);

        var ingestion = document.BeginFileIngestion("test.pdf", "application/pdf", 512, "dev-admin", null, Now);

        ingestion.MarkStaged(
            "2026/09/02/file.bin",
            new string('a', 64),
            512,
            Now.AddSeconds(1));

        ingestion.RejectSecurityScan(
            "malware_detected",
            "Test threat.",
            "application/pdf",
            Now.AddSeconds(2));

        Assert.AreEqual(
            DocumentFileIngestionStatus.Rejected,
            ingestion.Status);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ingestion.MarkSecurityApproved(
                "application/pdf",
                "ClamAV/1.5.4",
                Now.AddSeconds(3)));
    }


    [TestMethod]
    public void AcceptedIngestion_RequiresSecurityApproval()
    {
        var document = Document.Create("Promotion test", Now);

        var ingestion = document.BeginFileIngestion("test.pdf", "application/pdf", 512, "dev-admin", null, Now);

        ingestion.MarkStaged(
            "2026/09/02/file.bin",
            new string('a', 64),
            512,
            Now.AddSeconds(1));

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ingestion.MarkAccepted(
                "originals/sha256/aa/bb/hash",
                Now.AddSeconds(2)));
    }

    [TestMethod]
    public void SecurityApprovedIngestion_CanBecomeAccepted()
    {
        var document = Document.Create("Promotion test", Now);

        var ingestion = document.BeginFileIngestion("test.pdf", "application/pdf", 512, "dev-admin", null, Now);

        ingestion.MarkStaged(
            "2026/09/02/file.bin",
            new string('a', 64),
            512,
            Now.AddSeconds(1));

        ingestion.MarkSecurityApproved(
            "application/pdf",
            "ClamAV/1.5.4",
            Now.AddSeconds(2));

        ingestion.MarkAccepted(
            "originals/sha256/aa/bb/hash",
            Now.AddSeconds(3));

        Assert.AreEqual(
            DocumentFileIngestionStatus.Accepted,
            ingestion.Status);
    }

    /// <summary>
    /// §5: her sürüm kimin oluşturduğunu ve düzeltme gerekçesini taşımalıdır.
    /// </summary>
    [TestMethod]
    public void AddVersion_RecordsAuthorAndReason()
    {
        var document = Document.Create("Test Document", Now);

        document.AddVersion(
            "2026/09/02/v1.bin",
            new string('a', 64),
            "application/pdf",
            1024,
            "dev-admin",
            null,
            Now);

        var second = document.AddVersion(
            "2026/09/02/v2.bin",
            new string('b', 64),
            "application/pdf",
            2048,
            "kadir",
            "Sayfa 3 eksik taranmıştı.",
            Now.AddMinutes(5));

        Assert.AreEqual(2, second.VersionNumber);
        Assert.AreEqual("kadir", second.CreatedBy);
        Assert.AreEqual("Sayfa 3 eksik taranmıştı.", second.Reason);

        // Önceki sürüm yerinde kalır; düzeltme üzerine yazmaz.
        Assert.AreEqual(2, document.Versions.Count);
    }

    [TestMethod]
    public void AddVersion_RequiresAnAuthor()
    {
        var document = Document.Create("Test Document", Now);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => document.AddVersion(
                "2026/09/02/v1.bin",
                new string('a', 64),
                "application/pdf",
                1024,
                "   ",
                null,
                Now));
    }

    [TestMethod]
    public void BeginFileIngestion_CarriesTheVersionReason()
    {
        var document = Document.Create("Test Document", Now);

        var ingestion = document.BeginFileIngestion(
            "duzeltme.pdf",
            "application/pdf",
            128,
            "kadir",
            "  Mühür eksikti.  ",
            Now);

        Assert.AreEqual("kadir", ingestion.SubmittedBy);
        Assert.AreEqual("Mühür eksikti.", ingestion.VersionReason);
    }
}
