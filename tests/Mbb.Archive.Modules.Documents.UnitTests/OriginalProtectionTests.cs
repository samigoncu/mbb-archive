using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.BuildingBlocks.Domain;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Mbb.Archive.Modules.Documents.UnitTests;

[TestClass]
public sealed class OriginalProtectionTests
{
    [TestMethod]
    public void StorageVersionPinIsIdempotentAndRejectsReplacementAndNullVersion()
    {
        var document=Document.Create("Test",DateTimeOffset.UtcNow);
        document.AddVersion("key",new string('a',64),"application/pdf",10,"operator",null,DateTimeOffset.UtcNow);
        var version=document.Versions.Single();version.PinStorageVersion("storage-v1");version.PinStorageVersion("storage-v1");
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>version.PinStorageVersion("storage-v2"));
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>version.PinStorageVersion("null"));Assert.AreEqual("storage-v1",version.StorageVersionId);
    }
    [TestMethod]
    public void FailedProtectionCheckPreservesLastVerifiedStateAndRecordsFailure()
    {
        var now=DateTimeOffset.UtcNow;var document=Document.Create("Test",now);
        document.AddVersion("key",new string('a',64),"application/pdf",10,"operator",null,now);var version=document.Versions.Single();
        version.RecordProtection(now.AddYears(5),true,true,null,now);version.RecordProtection(null,false,false,"Provider unavailable",now.AddMinutes(1));
        Assert.AreEqual(now.AddYears(5),version.ProtectedUntil);Assert.IsTrue(version.StorageLegalHold);Assert.IsTrue(version.OwnsStorageLegalHold);
        Assert.AreEqual("Provider unavailable",version.ProtectionError);Assert.AreEqual(now.AddMinutes(1),version.ProtectionCheckedAt);
    }
    [TestMethod]
    public void SharedOriginalKeepsLongestRetentionAndEveryHold()
    {
        var now = DateTimeOffset.UtcNow;
        var result = OriginalProtectionPolicy.Combine([
            new(Guid.NewGuid(), now.AddYears(2), true, false),
            new(Guid.NewGuid(), now.AddYears(10), false, false),
            new(Guid.NewGuid(), null, false, true)]);
        Assert.AreEqual(now.AddYears(10), result.RetainUntil);
        Assert.IsTrue(result.LegalHold);
        Assert.IsTrue(result.Permanent);
    }

    [TestMethod]
    public void ReleasingOneHoldDoesNotRemoveAnotherDocumentsHold()
    {
        var result = OriginalProtectionPolicy.Combine([
            new(Guid.NewGuid(), null, false, false), new(Guid.NewGuid(), null, true, false)]);
        Assert.IsTrue(result.LegalHold);
    }

    [TestMethod]
    public void NoRequirementsDoNotCreateArtificialRetention()
    {
        var result = OriginalProtectionPolicy.Combine([]);
        Assert.IsNull(result.RetainUntil);
        Assert.IsFalse(result.LegalHold);
        Assert.IsFalse(result.Permanent);
    }
}
