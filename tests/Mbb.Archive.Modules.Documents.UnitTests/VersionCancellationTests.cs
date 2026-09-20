using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.UnitTests;

[TestClass]
public sealed class VersionCancellationTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static Document Create(int count = 3)
    {
        var document = Document.Create("Belge", Now);
        for (var n = 1; n <= count; n++) Add(document, n);
        return document;
    }
    private static void Add(Document document, int n) => document.AddVersion($"original/{n}", new string('a', 64), "application/pdf", 50, "user", "Yükleme", Now);

    [TestMethod]
    public void CancelOldVersion_PreservesBytesAndNumberAndCurrent()
    {
        var doc = Create(); var before = doc.ConcurrencyVersion;
        Assert.IsTrue(doc.CancelVersion(1, null, before, Guid.NewGuid(), "admin", "Mükerrer", Now));
        var old = doc.Versions.Single(v => v.VersionNumber == 1);
        Assert.AreEqual("original/1", old.StorageKey); Assert.AreEqual(new string('a',64), old.Sha256Hash);
        Assert.AreEqual("Mükerrer", old.CancellationReason); Assert.AreEqual("admin", old.CancelledBy);
        Assert.AreEqual(Now, old.CancelledAt); Assert.AreEqual(3, doc.CurrentVersionNumber); Assert.AreEqual(before+1, doc.ConcurrencyVersion);
        Add(doc, 4); Assert.AreEqual(4, doc.CurrentVersionNumber); Assert.AreEqual(4, doc.Versions.Count);
    }
    [TestMethod]
    public void CancelCurrent_UsesExplicitValidReplacement()
    {
        var doc = Create();
        doc.CancelVersion(3, 1, doc.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış dosya", Now);
        Assert.AreEqual(1, doc.CurrentVersionNumber); Assert.AreEqual(3, doc.Versions.Count);
        Add(doc, 4); Assert.AreEqual(4, doc.CurrentVersionNumber);
    }
    [TestMethod]
    public void CurrentCancellation_RequiresAnotherValidVersion()
    {
        var doc = Create();
        foreach (var replacement in new int?[] { null, 3, 99 })
            Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(3, replacement, doc.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış", Now));
        doc.CancelVersion(1, null, doc.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış", Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(3, 1, doc.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış", Now));
        Assert.AreEqual(3, doc.CurrentVersionNumber);
        var only = Create(1);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => only.CancelVersion(1, null, only.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış", Now));
    }
    [TestMethod]
    public void Replay_IsIdempotentAndChangedReplayConflicts()
    {
        var doc = Create(); var expected = doc.ConcurrencyVersion; var id = Guid.NewGuid();
        doc.CancelVersion(3, 1, expected, id, "admin", "Yanlış", Now); var after = doc.ConcurrencyVersion;
        Assert.IsFalse(doc.CancelVersion(3, 1, expected, id, "admin", "Yanlış", Now));
        Assert.AreEqual(after, doc.ConcurrencyVersion);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(3, 2, expected, id, "admin", "Yanlış", Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(2, null, after, id, "admin", "Yanlış", Now));
    }
    [TestMethod]
    public void ArchivedStaleAndInvalidRequests_DoNotMutate()
    {
        var doc = Create(); var before = doc.ConcurrencyVersion;
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(1, null, before-1, Guid.NewGuid(), "admin", "Yanlış", Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(1, null, before, Guid.Empty, "admin", "Yanlış", Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(1, null, before, Guid.NewGuid(), "admin", " ", Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(1, 2, before, Guid.NewGuid(), "admin", "Yanlış", Now));
        doc.Archive(Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => doc.CancelVersion(1, null, doc.ConcurrencyVersion, Guid.NewGuid(), "admin", "Yanlış", Now));
        Assert.IsTrue(doc.Versions.All(v => v.CancelledAt is null));
    }
}
