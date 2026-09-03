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

    [TestMethod]
    public void InvalidHierarchy_IsRejected()
    {
        var root = ArchiveLocation.CreateRoot("ROOT", "Kurum Arşivi", "L-001", Now);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocation.CreateChild(
                root,
                ArchiveLocationType.Shelf,
                "S-1",
                "Raf",
                "L-002",
                100,
                Now));
    }

    [TestMethod]
    public void FolderOnLoan_CannotMove()
    {
        var shelf = BuildShelf();
        var folder = PhysicalFolder.Register("F-1", "Dosya", "934", shelf, Now);

        folder.CheckOut();

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => folder.MoveTo(shelf, Now.AddHours(1)));
    }

    private static ArchiveLocation BuildShelf()
    {
        var root = ArchiveLocation.CreateRoot("ROOT", "Root", "L1", Now);
        var building = ArchiveLocation.CreateChild(root, ArchiveLocationType.Building, "B1", "Bina", "L2", null, Now);
        var area = ArchiveLocation.CreateChild(building, ArchiveLocationType.ArchiveArea, "A1", "Alan", "L3", null, Now);
        var room = ArchiveLocation.CreateChild(area, ArchiveLocationType.Room, "R1", "Oda", "L4", null, Now);
        var aisle = ArchiveLocation.CreateChild(room, ArchiveLocationType.Aisle, "I1", "Koridor", "L5", null, Now);
        var cabinet = ArchiveLocation.CreateChild(aisle, ArchiveLocationType.Cabinet, "C1", "Dolap", "L6", null, Now);

        return ArchiveLocation.CreateChild(
            cabinet,
            ArchiveLocationType.Shelf,
            "S1",
            "Raf",
            "L7",
            100,
            Now);
    }
}
