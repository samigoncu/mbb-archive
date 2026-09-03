using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.UnitTests;

[TestClass]
public sealed class EypPackageInspectionTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 18, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void StructuralValidity_DoesNotImplyOfficialConformance()
    {
        var inspection = EypPackageInspection.Create(
            null,
            null,
            "example.eyp",
            new string('a', 64),
            Now);

        inspection.ApplyResults(
            partCount: 12,
            relationshipCount: 4,
            EypStructuralStatus.ValidOpc,
            EypOfficialValidationStatus.NotConfigured,
            "{\"validOpc\":true}",
            "{\"providerConfigured\":false}");

        Assert.AreEqual(EypStructuralStatus.ValidOpc, inspection.StructuralStatus);
        Assert.AreEqual(
            EypOfficialValidationStatus.NotConfigured,
            inspection.OfficialValidationStatus);
    }

    [TestMethod]
    public void InvalidOpc_CanBeRecordedSeparatelyFromOfficialValidation()
    {
        var inspection = EypPackageInspection.Create(
            Guid.CreateVersion7(),
            Guid.CreateVersion7(),
            "broken.eyp",
            new string('b', 64),
            Now);

        inspection.ApplyResults(
            partCount: 0,
            relationshipCount: 0,
            EypStructuralStatus.Invalid,
            EypOfficialValidationStatus.NotConfigured,
            "{\"validOpc\":false}",
            "{}");

        Assert.AreEqual(EypStructuralStatus.Invalid, inspection.StructuralStatus);
        Assert.AreEqual(
            EypOfficialValidationStatus.NotConfigured,
            inspection.OfficialValidationStatus);
    }
}
