using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.UnitTests;

/// <summary>
/// Yerleşim seviyesi kataloğunun kuralları.
/// </summary>
/// <remarks>
/// Seviyeler koda gömülü bir enum olmaktan çıkıp tanım verisine dönüştü;
/// kurum kendi yerleşimine seviye ekleyebiliyor. Kalıbın serbestliği,
/// tutarlılığı koruyan kuralların testsiz kalmasını göze aldırmaz: yanlış
/// kurulmuş bir hiyerarşi, klasörün fiziksel olarak bulunamaması demektir.
/// </remarks>
[TestClass]
public sealed class LocationTypeCatalogTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 20, 12, 0, 0, TimeSpan.Zero);

    private static ArchiveLocationTypeDefinition BuiltIn(string code)
    {
        var (_, name, level, canStore, allowsCapacity) =
            ArchiveLocationTypeDefinition.BuiltIns.Single(x => x.Code == code);
        return ArchiveLocationTypeDefinition.Create(code, name, level, canStore, allowsCapacity, isBuiltIn: true);
    }

    [TestMethod]
    public void AraSeviyeAtlanabilir()
    {
        // Zincir katı değildir: koridoru olmayan bir arşivde dolap doğrudan
        // odaya bağlanabilmelidir, yoksa kurum kendi yapısını kuramaz.
        var room = BuiltIn("Room");
        var cabinet = BuiltIn("Cabinet");

        Assert.IsTrue(cabinet.CanNestUnder(room));
    }

    [TestMethod]
    public void AyniSeviyeKendiAltinaAcilamaz()
    {
        var room = BuiltIn("Room");

        Assert.IsFalse(room.CanNestUnder(BuiltIn("Room")));
    }

    [TestMethod]
    public void KokSeviyePasifeAlinamaz()
    {
        var root = BuiltIn("InstitutionArchive");

        // Kök seviye kapanırsa yeni hiçbir konum açılamaz; kilitlenme olur.
        Assert.ThrowsExactly<DomainRuleViolationException>(() => root.SetActive(false));
    }

    [TestMethod]
    public void KapasiteYalnizKlasorTasiyanSeviyedeTanimlanir()
    {
        // Kapasite, "kaç klasör sığar" demektir; klasör taşımayan bir seviyede
        // anlamsızdır ve doluluk raporunu yanıltır.
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("Floor", "Kat", 3, canStoreFolder: false, allowsCapacity: true));
    }

    [TestMethod]
    public void OzelSeviyeEklenebilirVeHiyerarsiyeGirer()
    {
        var room = BuiltIn("Room");
        var floor = ArchiveLocationTypeDefinition.Create("Floor", "Kat", 3, canStoreFolder: false, allowsCapacity: false);
        var cabinet = BuiltIn("Cabinet");

        Assert.IsTrue(floor.CanNestUnder(BuiltIn("Building")));
        Assert.IsTrue(room.CanNestUnder(floor));
        Assert.IsTrue(cabinet.CanNestUnder(floor));
    }

    [TestMethod]
    public void SeviyeSiniriDisiReddedilir()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("X", "Sıfır", 0, false, false));
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("X", "Aşırı", 51, false, false));
    }

    [TestMethod]
    public void KlasorYalnizKlasorTasiyanSeviyeyeKonur()
    {
        var root = ArchiveLocation.CreateRoot(BuiltIn("InstitutionArchive"), "ROOT", "Kurum Arşivi", "L-001", Now);
        var room = ArchiveLocation.CreateChild(
            root, BuiltIn("InstitutionArchive"), BuiltIn("Room"), "ODA-1", "Arşiv Odası", "L-002", null, Now);

        // Oda klasör taşımaz; klasör rafa ya da kutuya konur.
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => PhysicalFolder.Register("F-1", "Dosya", "TEST.01", room, BuiltIn("Room"), Now));
    }

    [TestMethod]
    public void SeviyeAdiZorunluVeSinirli()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("X", "   ", 2, false, false));
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("X", new string('a', 101), 2, false, false));
    }

    [TestMethod]
    public void SeviyeKoduZorunlu()
    {
        // Kod değişmez anahtardır: konum kayıtları ona bağlanır.
        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => ArchiveLocationTypeDefinition.Create("  ", "Kat", 2, false, false));
    }
}
