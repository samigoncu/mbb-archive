using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.UnitTests;

/// <summary>
/// Kapsam süzgecinin sızıntı testleri. Kullanıcının sorusu birebir buradadır:
/// Bilgi İşlem'in evrakını İnsan Kaynakları görmemeli.
/// </summary>
[TestClass]
public sealed class DocumentAccessFilterTests
{
    private const string BilgiIslem = "/MBB/GS/BID/";
    private const string Yazilim = "/MBB/GS/BID/BID-YAZ/";
    private const string InsanKaynaklari = "/MBB/GS/IKE/";
    private const string Ozluk = "/MBB/GS/IKE/IKE-OZL/";

    private static readonly DateTimeOffset Now =
        new(2026, 9, 5, 10, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void Hr_cannot_see_an_it_document()
    {
        var document = OwnedBy(Yazilim);
        var scope = ScopeFor(InsanKaynaklari, Ozluk);

        Assert.IsFalse(Matches(scope, document));
        Assert.IsFalse(DocumentAccessFilter.Allows(scope, document.Id.Value, document.OwnerUnitPath));
    }

    [TestMethod]
    public void A_unit_sees_its_own_document()
    {
        var document = OwnedBy(Yazilim);
        var scope = ScopeFor(Yazilim);

        Assert.IsTrue(Matches(scope, document));
    }

    /// <summary>Daire başkanı alt şubenin evrakını görür (devralma açık).</summary>
    [TestMethod]
    public void A_department_sees_its_branch_documents()
    {
        var document = OwnedBy(Yazilim);
        var scope = ScopeFor(BilgiIslem);

        Assert.IsTrue(Matches(scope, document));
    }

    /// <summary>Şube, üst dairenin evrakını görmez — devralma yalnız aşağı doğrudur.</summary>
    [TestMethod]
    public void A_branch_does_not_see_its_parent_documents()
    {
        var document = OwnedBy(BilgiIslem);
        var scope = ScopeFor(Yazilim);

        Assert.IsFalse(Matches(scope, document));
    }

    /// <summary>
    /// Önek eşleşmesi kod sınırında durmalı: <c>/MBB/GS/BID/</c> kapsamı
    /// <c>/MBB/GS/BIDX/</c> birimini yakalamamalı.
    /// </summary>
    [TestMethod]
    public void Prefix_match_does_not_leak_into_a_similarly_named_unit()
    {
        var document = OwnedBy("/MBB/GS/BIDESTEK/");
        var scope = ScopeFor(BilgiIslem);

        Assert.IsFalse(Matches(scope, document));
    }

    [TestMethod]
    public void An_unrestricted_subject_sees_everything()
    {
        var document = OwnedBy(Yazilim);
        var scope = new AccessScope("teftis", true, [], [], [], []);

        Assert.IsTrue(Matches(scope, document));
        Assert.IsTrue(DocumentAccessFilter.Allows(scope, document.Id.Value, document.OwnerUnitPath));
    }

    /// <summary>
    /// Hiçbir birime üye olmayan özne hiçbir şey görmez. En tehlikeli hata
    /// burada "hepsini göster"e düşmektir.
    /// </summary>
    [TestMethod]
    public void A_subject_without_any_unit_sees_nothing()
    {
        var document = OwnedBy(Yazilim);
        var scope = AccessScope.Empty("yeni-personel");

        Assert.IsFalse(Matches(scope, document));
    }

    /// <summary>
    /// Sahibi belirlenmemiş belge kimseye görünmez; geri doldurulmamış kayıt
    /// sessizce açılmamalıdır.
    /// </summary>
    [TestMethod]
    public void An_unowned_document_is_invisible_to_scoped_subjects()
    {
        var document = Document.Create("Sahipsiz", Now);
        var scope = ScopeFor(BilgiIslem);

        Assert.IsFalse(Matches(scope, document));
        Assert.IsFalse(DocumentAccessFilter.Allows(scope, document.Id.Value, null));
    }

    [TestMethod]
    public void An_unowned_document_is_still_visible_to_an_unrestricted_subject()
    {
        var document = Document.Create("Sahipsiz", Now);
        var scope = new AccessScope("teftis", true, [], [], [], []);

        Assert.IsTrue(Matches(scope, document));
    }

    /// <summary>Doğrudan paylaşım birim sınırını aşar (§20/§21 istisna yolu).</summary>
    [TestMethod]
    public void A_direct_grant_crosses_the_unit_boundary()
    {
        var document = OwnedBy(Yazilim);

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [document.Id.Value],
            []);

        Assert.IsTrue(Matches(scope, document));
        Assert.IsTrue(DocumentAccessFilter.Allows(scope, document.Id.Value, document.OwnerUnitPath));
    }

    [TestMethod]
    public void A_grant_for_another_document_does_not_open_this_one()
    {
        var document = OwnedBy(Yazilim);

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [Guid.CreateVersion7()],
            []);

        Assert.IsFalse(Matches(scope, document));
    }

    [TestMethod]
    public void Multiple_memberships_widen_the_scope()
    {
        var itDocument = OwnedBy(Yazilim);
        var hrDocument = OwnedBy(Ozluk);
        var scope = ScopeFor(BilgiIslem, InsanKaynaklari);

        Assert.IsTrue(Matches(scope, itDocument));
        Assert.IsTrue(Matches(scope, hrDocument));
    }

    /// <summary>
    /// Dosya planı dalı paylaşımı ölçeklenen yoldur: "İK tüm birimlerin 903
    /// Özlük evrakını görsün" tek kayıttır.
    /// </summary>
    [TestMethod]
    public void A_file_plan_grant_crosses_the_unit_boundary()
    {
        var document = OwnedBy(Yazilim);
        document.SetFilePlanCode("903.01");

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [],
            ["903.01"]);

        Assert.IsTrue(Matches(scope, document));
        Assert.IsTrue(
            DocumentAccessFilter.Allows(
                scope,
                document.Id.Value,
                document.OwnerUnitPath,
                document.FilePlanCode));
    }

    [TestMethod]
    public void A_file_plan_grant_is_case_insensitive()
    {
        var document = OwnedBy(Yazilim);
        document.SetFilePlanCode("903.01");

        var scope = new AccessScope("zeynep", false, [], [], [], ["903.01"]);

        Assert.IsTrue(Matches(scope, document));
    }

    [TestMethod]
    public void A_grant_for_another_file_plan_branch_does_not_open_this_one()
    {
        var document = OwnedBy(Yazilim);
        document.SetFilePlanCode("770.02");

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [],
            ["903.01"]);

        Assert.IsFalse(Matches(scope, document));
    }

    /// <summary>
    /// Yalnız ikincil sınıflandırması olan belge, dosya planı paylaşımından
    /// yararlanmaz: belgeye yalnız birincil kod yazılır.
    /// </summary>
    [TestMethod]
    public void A_document_without_a_file_plan_code_is_not_opened_by_a_branch_grant()
    {
        var document = OwnedBy(Yazilim);

        var scope = new AccessScope("zeynep", false, [], [], [], ["903.01"]);

        Assert.IsFalse(Matches(scope, document));
    }

    private static Document OwnedBy(string unitPath)
    {
        var document = Document.Create("Test", Now);
        document.AssignOwnerUnit(Guid.CreateVersion7(), unitPath);
        return document;
    }

    private static AccessScope ScopeFor(params string[] paths)
        => new("kullanici", false, paths, [], [], []);

    /// <summary>Sorgu yüklemini bellek üzerinde uygular.</summary>
    private static bool Matches(AccessScope scope, Document document)
        => DocumentAccessFilter.For(scope).Compile()(document);
}
