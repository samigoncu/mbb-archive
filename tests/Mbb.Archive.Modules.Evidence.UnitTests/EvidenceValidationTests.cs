using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.UnitTests;

[TestClass]
public sealed class EvidenceValidationTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 18, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void Complete_StoresImmutableValidationSnapshot()
    {
        var validation = EvidenceValidation.Start(
            Guid.CreateVersion7(),
            Guid.CreateVersion7(),
            EvidenceKind.Rfc3161Timestamp,
            new string('a', 64),
            "RFC 3161",
            Now);

        validation.Complete(
            EvidenceValidationStatus.Valid,
            ".NET Rfc3161TimestampToken",
            "{\"cryptographicValid\":true}",
            Now.AddSeconds(1));

        Assert.AreEqual(EvidenceValidationStatus.Valid, validation.Status);
        Assert.AreEqual(".NET Rfc3161TimestampToken", validation.Provider);
        Assert.IsNotNull(validation.CompletedAt);
    }

    [TestMethod]
    public void Complete_CannotRunTwice()
    {
        var validation = EvidenceValidation.Start(
            null,
            null,
            EvidenceKind.CmsSignature,
            new string('b', 64),
            "CMS",
            Now);

        validation.Complete(
            EvidenceValidationStatus.Indeterminate,
            ".NET SignedCms",
            "{}",
            Now.AddSeconds(1));

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => validation.Complete(
                EvidenceValidationStatus.Valid,
                ".NET SignedCms",
                "{}",
                Now.AddSeconds(2)));
    }

    [TestMethod]
    public void Start_RejectsInvalidSha256()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => EvidenceValidation.Start(
                null,
                null,
                EvidenceKind.PdfPades,
                "not-a-sha",
                "PAdES",
                Now));
    }
}
