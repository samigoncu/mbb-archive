using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Collections.Domain.Collections;

namespace Mbb.Archive.Modules.Collections.UnitTests;

[TestClass]
public sealed class DocumentCollectionTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 5, 10, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// §20: aynı belge iki kez eklenirse kopya oluşmamalıdır.
    /// </summary>
    [TestMethod]
    public void AddDocument_IsIdempotent()
    {
        var collection = Create();
        var documentId = Guid.CreateVersion7();

        var first = collection.AddDocument(documentId, "kadir", Now);
        var second = collection.AddDocument(documentId, "kadir", Now.AddMinutes(1));

        Assert.IsNotNull(first);
        Assert.IsNull(second);
        Assert.AreEqual(1, collection.Items.Count);
    }

    [TestMethod]
    public void AddDocument_AllowsTheSameDocumentInAnotherCollection()
    {
        var documentId = Guid.CreateVersion7();
        var first = Create("Sayıştay 2026");
        var second = Create("Hal Yolu");

        first.AddDocument(documentId, "kadir", Now);
        second.AddDocument(documentId, "kadir", Now);

        Assert.AreEqual(1, first.Items.Count);
        Assert.AreEqual(1, second.Items.Count);
    }

    [TestMethod]
    public void RemoveDocument_ReportsWhetherAnythingWasRemoved()
    {
        var collection = Create();
        var documentId = Guid.CreateVersion7();

        collection.AddDocument(documentId, "kadir", Now);

        Assert.IsTrue(collection.RemoveDocument(documentId));
        Assert.IsFalse(collection.RemoveDocument(documentId));
        Assert.AreEqual(0, collection.Items.Count);
    }

    [TestMethod]
    public void Create_RequiresAName()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => DocumentCollection.Create("   ", null, "kadir", false, Now));

    [TestMethod]
    public void Create_RequiresAnOwner()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => DocumentCollection.Create("Sayıştay", null, "  ", false, Now));

    [TestMethod]
    public void AddDocument_RejectsAnEmptyDocumentId()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => Create().AddDocument(Guid.Empty, "kadir", Now));

    [TestMethod]
    public void Rename_TrimsAndKeepsConcurrencyMoving()
    {
        var collection = Create();
        var before = collection.ConcurrencyVersion;

        collection.Rename("  Yeni ad  ", "  açıklama  ");

        Assert.AreEqual("Yeni ad", collection.Name);
        Assert.AreEqual("açıklama", collection.Description);
        Assert.IsTrue(collection.ConcurrencyVersion > before);
    }

    [TestMethod]
    public void ChangeSharing_IsANoOpWhenUnchanged()
    {
        var collection = Create();
        var before = collection.ConcurrencyVersion;

        collection.ChangeSharing(collection.IsShared);

        Assert.AreEqual(before, collection.ConcurrencyVersion);
    }

    private static DocumentCollection Create(string name = "Sayıştay 2026")
        => DocumentCollection.Create(name, null, "kadir", false, Now);
}
