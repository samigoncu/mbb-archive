using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Archive.Application.Abstractions;
using Mbb.Archive.Modules.Archive.Domain.Records;

namespace Mbb.Archive.Modules.Archive.UnitTests;

/// <summary>
/// Kayıt beyanı listesinin sızıntı testleri. Kayıt, belgenin künyesidir:
/// belgeyi göremeyen kullanıcı künyesini — özetini, boyutunu, var olduğunu —
/// de görmemelidir.
/// </summary>
[TestClass]
public sealed class ArchiveRecordAccessFilterTests
{
    private const string BilgiIslem = "/MBB/GS/BID/";
    private const string Yazilim = "/MBB/GS/BID/BID-YAZ/";
    private const string InsanKaynaklari = "/MBB/GS/IKE/";

    [TestMethod]
    public void Hr_cannot_see_an_it_record()
    {
        var record = OwnedBy(Yazilim);
        var scope = ScopeFor(InsanKaynaklari);

        Assert.IsFalse(Matches(scope, record));
        Assert.IsFalse(
            ArchiveRecordAccessFilter.Allows(
                scope,
                record.DocumentId,
                record.OwnerUnitPath));
    }

    [TestMethod]
    public void A_department_sees_its_branch_records()
    {
        Assert.IsTrue(Matches(ScopeFor(BilgiIslem), OwnedBy(Yazilim)));
    }

    [TestMethod]
    public void A_branch_does_not_see_its_parent_records()
    {
        Assert.IsFalse(Matches(ScopeFor(Yazilim), OwnedBy(BilgiIslem)));
    }

    /// <summary>Önek eşleşmesi kod sınırında durmalı.</summary>
    [TestMethod]
    public void Prefix_match_does_not_leak_into_a_similarly_named_unit()
    {
        Assert.IsFalse(Matches(ScopeFor(BilgiIslem), OwnedBy("/MBB/GS/BIDESTEK/")));
    }

    [TestMethod]
    public void An_unrestricted_subject_sees_everything()
    {
        var record = OwnedBy(Yazilim);
        var scope = new AccessScope("teftis", true, [], [], [], []);

        Assert.IsTrue(Matches(scope, record));
        Assert.IsTrue(
            ArchiveRecordAccessFilter.Allows(
                scope,
                record.DocumentId,
                record.OwnerUnitPath));
    }

    [TestMethod]
    public void A_subject_without_any_unit_sees_nothing()
    {
        Assert.IsFalse(Matches(AccessScope.Empty("yeni-personel"), OwnedBy(Yazilim)));
    }

    /// <summary>
    /// Geri doldurulmamış kayıt görünmez. Bu sürümde sütun yeni eklendiği için
    /// eski kayıtlar boştur; sessizce herkese açılmaları kabul edilemez.
    /// </summary>
    [TestMethod]
    public void A_record_without_an_owner_unit_is_invisible_to_scoped_subjects()
    {
        var record = OwnedBy(null);

        Assert.IsFalse(Matches(ScopeFor(BilgiIslem), record));
        Assert.IsFalse(
            ArchiveRecordAccessFilter.Allows(scope: ScopeFor(BilgiIslem), record.DocumentId, null));
    }

    [TestMethod]
    public void A_record_without_an_owner_unit_is_still_visible_to_an_unrestricted_subject()
    {
        Assert.IsTrue(Matches(new AccessScope("teftis", true, [], [], [], []), OwnedBy(null)));
    }

    /// <summary>Belgeye verilen doğrudan paylaşım künyesini de açar.</summary>
    [TestMethod]
    public void A_direct_document_grant_crosses_the_unit_boundary()
    {
        var record = OwnedBy(Yazilim);

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [record.DocumentId],
            []);

        Assert.IsTrue(Matches(scope, record));
    }

    [TestMethod]
    public void A_grant_for_another_document_does_not_open_this_record()
    {
        var record = OwnedBy(Yazilim);

        var scope = new AccessScope(
            "zeynep",
            false,
            [InsanKaynaklari],
            [],
            [Guid.CreateVersion7()],
            []);

        Assert.IsFalse(Matches(scope, record));
    }

    /// <summary>Dosya planı dalı paylaşımı beyan edilmiş kayıtta çalışır.</summary>
    [TestMethod]
    public void A_file_plan_grant_crosses_the_unit_boundary()
    {
        var record = OwnedBy(Yazilim);
        record.Declare("903.01", "R1", DateTimeOffset.UtcNow);

        var scope = new AccessScope("zeynep", false, [InsanKaynaklari], [], [], ["903.01"]);

        Assert.IsTrue(Matches(scope, record));
    }

    [TestMethod]
    public void A_grant_for_another_file_plan_branch_does_not_open_this_record()
    {
        var record = OwnedBy(Yazilim);
        record.Declare("770.02", "R1", DateTimeOffset.UtcNow);

        var scope = new AccessScope("zeynep", false, [InsanKaynaklari], [], [], ["903.01"]);

        Assert.IsFalse(Matches(scope, record));
    }

    /// <summary>Beyan edilmemiş kayıtta sınıflandırma yoktur; dal paylaşımı onu açmaz.</summary>
    [TestMethod]
    public void An_undeclared_record_is_not_opened_by_a_file_plan_grant()
    {
        var scope = new AccessScope("zeynep", false, [], [], [], ["903.01"]);

        Assert.IsFalse(Matches(scope, OwnedBy(Yazilim)));
    }

    /// <summary>
    /// Sahibi birim yolu tazelenebilir; birim taşındığında görünürlük kopyası
    /// belgeyle birlikte hareket eder.
    /// </summary>
    [TestMethod]
    public void Refreshing_the_owner_unit_moves_visibility()
    {
        var record = OwnedBy(Yazilim);
        record.RefreshOwnerUnitPath(InsanKaynaklari);

        Assert.IsFalse(Matches(ScopeFor(BilgiIslem), record));
        Assert.IsTrue(Matches(ScopeFor(InsanKaynaklari), record));
    }

    [TestMethod]
    public void Refreshing_with_the_same_path_does_not_bump_the_concurrency_token()
    {
        var record = OwnedBy(Yazilim);
        var before = record.ConcurrencyVersion;

        record.RefreshOwnerUnitPath(Yazilim);

        Assert.AreEqual(before, record.ConcurrencyVersion);
    }

    private static ArchiveRecord OwnedBy(string? unitPath)
        => ArchiveRecord.RegisterCandidate(
            Guid.CreateVersion7(),
            Guid.CreateVersion7(),
            "orijinal/anahtar",
            new string('a', 64),
            "application/pdf",
            1024,
            unitPath,
            DateTimeOffset.UtcNow);

    private static AccessScope ScopeFor(params string[] paths)
        => new("kullanici", false, paths, [], [], []);

    private static bool Matches(AccessScope scope, ArchiveRecord record)
        => ArchiveRecordAccessFilter.For(scope).Compile()(record);
}
