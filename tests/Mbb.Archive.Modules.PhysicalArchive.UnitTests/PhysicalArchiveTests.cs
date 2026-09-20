using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.UnitTests;

[TestClass]
public sealed class PhysicalArchiveTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 12, 0, 0, TimeSpan.Zero);

    /// <summary>Kurulum seviyeleri; katalog artık veri olduğu için testte de kurulur.</summary>
    private static ArchiveLocationTypeDefinition Type(string code)
    {
        var (_, name, level, canStore, allowsCapacity) =
            ArchiveLocationTypeDefinition.BuiltIns.Single(x => x.Code == code);
        return ArchiveLocationTypeDefinition.Create(code, name, level, canStore, allowsCapacity, isBuiltIn: true);
    }

    [TestMethod]
    public void InvalidHierarchy_IsRejected()
    {
        var root = ArchiveLocation.CreateRoot(Type("InstitutionArchive"), "ROOT", "Kurum Arşivi", "L-001", Now);

        var shelf = ArchiveLocation.CreateChild(
            root, Type("InstitutionArchive"), Type("Shelf"), "S-1", "Raf", "L-002", 100, Now);

        // Daha sığ bir seviye, daha derin bir konumun altına açılamaz.
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocation.CreateChild(
                shelf,
                Type("Shelf"),
                Type("Building"),
                "B-1",
                "Bina",
                "L-003",
                null,
                Now));
    }

    [TestMethod]
    public void FolderOnLoan_CannotMove()
    {
        var shelf = BuildShelf();
        var folder = PhysicalFolder.Register("F-1", "Dosya", "934", shelf, Type("Shelf"), Now);

        folder.CheckOut();

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => folder.MoveTo(shelf, Type("Shelf"), Now.AddHours(1)));
    }

    [TestMethod]
    public void PhysicalDisposition_PreservesLinksAndDoesNotCloseMixedFolder()
    {
        var folder = PhysicalFolder.Register("F-2", "Karma dosya", "934", BuildShelf(), Type("Shelf"), Now);
        var first = Guid.NewGuid(); var second = Guid.NewGuid(); var process = Guid.NewGuid(); var evidence = Guid.NewGuid();
        folder.LinkDocument(first, Now); folder.LinkDocument(second, Now);
        folder.RecordPhysicalDisposition(first, process, "executor", "T26", evidence, Now);
        Assert.AreEqual(2, folder.Documents.Count);
        Assert.AreEqual(PhysicalFolderStatus.Available, folder.Status);
        Assert.IsNotNull(folder.Documents.Single(x => x.DocumentId == first).DisposedAt);
        Assert.IsNull(folder.Documents.Single(x => x.DocumentId == second).DisposedAt);
        folder.RecordPhysicalDisposition(first, process, "executor", "T26", evidence, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => folder.UnlinkDocument(first));
        folder.RecordPhysicalDisposition(second, Guid.NewGuid(), "executor", "T27", Guid.NewGuid(), Now);
        Assert.AreEqual(PhysicalFolderStatus.Disposed, folder.Status);
        Assert.ThrowsExactly<DomainRuleViolationException>(folder.CheckOut);
    }

    [TestMethod]
    public void PhysicalDisposition_OnLoanOrDifferentProcessIsRejected()
    {
        var folder = PhysicalFolder.Register("F-3", "Dosya", "934", BuildShelf(), Type("Shelf"), Now);
        var document = Guid.NewGuid(); folder.LinkDocument(document, Now); folder.CheckOut();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => folder.RecordPhysicalDisposition(document, Guid.NewGuid(), "executor", "T26", Guid.NewGuid(), Now));
        folder.CheckIn(); folder.RecordPhysicalDisposition(document, Guid.NewGuid(), "executor", "T26", Guid.NewGuid(), Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => folder.RecordPhysicalDisposition(document, Guid.NewGuid(), "executor", "T27", Guid.NewGuid(), Now));
        Assert.AreEqual(1, folder.Documents.Count);
    }

    private static ArchiveLocation BuildShelf()
    {
        var root = ArchiveLocation.CreateRoot(Type("InstitutionArchive"), "ROOT", "Root", "L1", Now);
        var building = ArchiveLocation.CreateChild(root, Type("InstitutionArchive"), Type("Building"), "B1", "Bina", "L2", null, Now);
        var area = ArchiveLocation.CreateChild(building, Type("Building"), Type("ArchiveArea"), "A1", "Alan", "L3", null, Now);
        var room = ArchiveLocation.CreateChild(area, Type("ArchiveArea"), Type("Room"), "R1", "Oda", "L4", null, Now);
        var aisle = ArchiveLocation.CreateChild(room, Type("Room"), Type("Aisle"), "I1", "Koridor", "L5", null, Now);
        var cabinet = ArchiveLocation.CreateChild(aisle, Type("Aisle"), Type("Cabinet"), "C1", "Dolap", "L6", null, Now);

        return ArchiveLocation.CreateChild(
            cabinet,
            Type("Cabinet"),
            Type("Shelf"),
            "S1",
            "Raf",
            "L7",
            100,
            Now);
    }
}
