using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.Documents.Application.Documents.Create;
using Mbb.Archive.Modules.Documents.Application.Documents.List;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Application.Queries;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass, DoNotParallelize]
public sealed class ArchiveFilingTests
{
    private FilingFixture _f = null!;
    private static PageRequest Page => PageRequest.Create(1, 25).Value;
    [TestInitialize] public async Task Initialize() { _f = new(); await _f.Initialize(); }
    [TestCleanup] public async Task Cleanup() { if (_f is not null) await _f.DisposeAsync(); }

    [TestMethod] public async Task DossierSorting_HappensBeforePagination()
    {
        var repo = _f.Get<IDossierRepository>();
        foreach(var title in new[]{"AAAA", "ZZZZ"}) await repo.AddAsync(DigitalDossier.Create(_f.Owner,_f.Plan,_f.Item,"1","TEST.01","Test",title,2026,DateTimeOffset.UtcNow),default);
        await _f.Get<DocumentsDbContext>().SaveChangesAsync();
        var all = await _f.Get<IDossierQueries>().ListAsync(Page,new(Sort:"titleDesc"),default);
        var first = await _f.Get<IDossierQueries>().ListAsync(PageRequest.Create(1,1).Value,new(Sort:"titleDesc"),default);
        Assert.AreEqual(all.Items[0].Id, first.Items[0].Id);
        Assert.AreEqual(all.TotalCount, first.TotalCount);
    }
    [TestMethod] public async Task Rename_RequiresOwnerAndRejectsStaleTitle()
    {
        var handler = _f.Get<DossierHandlers>();
        Assert.IsTrue((await handler.RenameAsync(_f.OtherDossier.Id, new("Forbidden", _f.OtherDossier.Title), default)).IsFailure);
        var title = _f.Dossier.Title;
        Assert.IsTrue((await handler.RenameAsync(_f.Dossier.Id, new("Yeni klasör", title), default)).IsSuccess);
        Assert.AreEqual("Yeni klasör", (await _f.Get<IDossierQueries>().GetAsync(_f.Dossier.Id, default))!.Title);
        Assert.IsTrue((await handler.RenameAsync(_f.Dossier.Id, new("Stale", title), default)).IsFailure);
    }

    [TestMethod] public async Task SameSdpCode_DoesNotExposeAnotherUnit_AndCountsAreScoped()
    {
        var dossiers = await _f.Get<IDossierQueries>().ListAsync(Page, new(FilePlanCode: "TEST.01"), default);
        Assert.AreEqual(1L, dossiers.TotalCount); Assert.AreEqual(_f.Dossier.Id, dossiers.Items.Single().Id);
        Assert.IsNull(await _f.Get<IDossierQueries>().GetAsync(_f.OtherDossier.Id, default));
        var docs = await _f.Get<IDocumentQueries>().GetPageAsync(Page, new(FilePlanCode: "TEST"), DocumentListSort.TitleAscending, _f.Scope, default);
        Assert.AreEqual(1L, docs.TotalCount); Assert.AreEqual(_f.Document.Id.Value, docs.Items.Single().Id);
        var forged = await _f.Get<IDocumentQueries>().GetPageAsync(Page, new(OwnerUnitId: _f.Other), DocumentListSort.TitleAscending, _f.Scope, default);
        Assert.AreEqual(0L, forged.TotalCount);
        var folders = await _f.Get<IPhysicalArchiveQueries>().GetFoldersPageAsync(Page, new(), default);
        Assert.AreEqual(1L, folders.TotalCount);
        Assert.IsNull(await _f.Get<IPhysicalArchiveQueries>().GetFolderAsync(_f.OtherFolder.Id, default));
        Assert.IsNull(await _f.Get<IPhysicalArchiveQueries>().GetFolderByBarcodeAsync(_f.OtherFolder.Barcode, default));
        Assert.IsNull(await _f.Get<IPhysicalArchiveQueries>().GetFolderAsync(_f.LegacyFolder.Id, default));
        var loans = await _f.Get<IPhysicalArchiveQueries>().GetLoansPageAsync(Page, new(), DateTimeOffset.UtcNow, default);
        Assert.AreEqual(1L, loans.TotalCount);
        var occupancy = await _f.Get<IPhysicalArchiveQueries>().GetLocationOccupancyAsync(default);
        Assert.AreEqual(1, occupancy.Single(x => x.Id == _f.Shelf.Id).FolderCount);
    }

    [TestMethod] public async Task GlobalRead_DoesNotAuthorizeCrossUnitMutation()
    {
        _f.Scope = _f.Scope with { Unrestricted = true };
        Assert.IsNotNull(await _f.Get<IDossierQueries>().GetAsync(_f.OtherDossier.Id, default));
        Assert.IsNotNull(await _f.Get<IPhysicalArchiveQueries>().GetFolderAsync(_f.OtherFolder.Id, default));
        var filing = await _f.Get<DossierHandlers>().FileAsync(_f.OtherDossier.Id, _f.OtherDocument.Id.Value, default);
        Assert.IsTrue(filing.IsFailure);
        var move = await _f.Get<PhysicalArchiveCommandHandlers>().Handle(new MovePhysicalFolderCommand(_f.OtherFolder.Id, _f.Shelf.Id), default);
        Assert.IsTrue(move.IsFailure);
        var create = await _f.Get<CreateDocumentCommandHandler>().Handle(new("Unauthorized", _f.Other), default);
        Assert.IsTrue(create.IsFailure);
    }

    [TestMethod] public async Task DigitalCreation_PersistsVersionAndOwner_WithoutPhysicalFolder()
    {
        var result = await _f.Get<DossierHandlers>().CreateAsync(new(_f.Owner, _f.Plan, _f.Item, "Yeni dosya", 2025), default);
        Assert.IsTrue(result.IsSuccess);
        var doc = await _f.Get<CreateDocumentCommandHandler>().Handle(new("Yeni belge", _f.Owner, result.Value), default);
        Assert.IsTrue(doc.IsSuccess);
        var stored = await _f.Get<DocumentsDbContext>().Set<DigitalDossier>().AsNoTracking().SingleAsync(x => x.Id == result.Value);
        Assert.AreEqual("2026-v1", stored.FilePlanVersion); Assert.AreEqual(2025, stored.Year);
        var record = await _f.Get<DocumentsDbContext>().Set<Document>().AsNoTracking().SingleAsync(x => x.Id == new DocumentId(doc.Value.Id));
        Assert.AreEqual(_f.Owner, record.OwnerUnitId); Assert.AreEqual(result.Value, record.DossierId);
        Assert.IsFalse(await _f.Get<PhysicalArchiveDbContext>().Set<PhysicalFolder>().AnyAsync(x => x.DigitalDossierId == result.Value));
    }

    [TestMethod] public async Task InvalidPlan_MissingMembership_AndCrossUnitLinks_AreRejected()
    {
        _f.ValidPlan = false;
        Assert.IsTrue((await _f.Get<DossierHandlers>().CreateAsync(new(_f.Owner, _f.Plan, _f.Item, "X", 2026), default)).IsFailure);
        var link = await _f.Get<PhysicalArchiveCommandHandlers>().Handle(new LinkDocumentToFolderCommand(_f.Folder.Id, _f.OtherDocument.Id.Value), default);
        Assert.IsTrue(link.IsFailure);
        Assert.IsTrue((await _f.Get<DossierHandlers>().FileAsync(_f.Dossier.Id, _f.OtherDocument.Id.Value, default)).IsFailure);
        _f.Scope = AccessScope.Empty("unassigned");
        Assert.IsTrue((await _f.Get<CreateDocumentCommandHandler>().Handle(new("X"), default)).IsFailure);
        Assert.AreEqual(0L, (await _f.Get<IDossierQueries>().ListAsync(Page, new(), default)).TotalCount);
        Assert.AreEqual(0L, (await _f.Get<IPhysicalArchiveQueries>().GetFoldersPageAsync(Page, new(), default)).TotalCount);
    }

    [TestMethod] public async Task PhysicalMove_PreservesOwnership_AndLinkedDocumentsStayScoped()
    {
        var move = await _f.Get<PhysicalArchiveCommandHandlers>().Handle(new MovePhysicalFolderCommand(_f.Folder.Id, _f.Shelf.Id), default);
        Assert.IsTrue(move.IsSuccess); Assert.AreEqual(_f.Owner, _f.Folder.OwnerUnitId); Assert.AreEqual(_f.Dossier.Id, _f.Folder.DigitalDossierId);
        // Even legacy malformed links must not leak document identifiers.
        _f.Folder.LinkDocument(_f.OtherDocument.Id.Value, DateTimeOffset.UtcNow);
        await _f.Get<PhysicalArchiveDbContext>().SaveChangesAsync();
        var detail = await _f.Get<PhysicalArchiveQueryHandlers>().Handle(new GetPhysicalFolderQuery(_f.Folder.Id), default);
        CollectionAssert.AreEqual(new[] { _f.Document.Id.Value }, detail.Value.DocumentIds.ToArray());
    }

    [TestMethod] public async Task PhysicalRegistration_RequiresMatchingUnitAndDossier_AndPersistsBoth()
    {
        var handler = _f.Get<PhysicalArchiveCommandHandlers>();
        var bad = await handler.Handle(new RegisterPhysicalFolderCommand(Guid.NewGuid().ToString(), "Yanlış", "TEST.01", _f.Shelf.Id, _f.Owner, _f.OtherDossier.Id), default);
        Assert.IsTrue(bad.IsFailure);
        var good = await handler.Handle(new RegisterPhysicalFolderCommand(Guid.NewGuid().ToString(), "Doğru", "TEST.01", _f.Shelf.Id, _f.Owner, _f.Dossier.Id), default);
        Assert.IsTrue(good.IsSuccess);
        var row = await _f.Get<PhysicalArchiveDbContext>().Set<PhysicalFolder>().AsNoTracking().SingleAsync(f => f.Id == good.Value);
        Assert.AreEqual(_f.Owner, row.OwnerUnitId); Assert.AreEqual(_f.Dossier.Id, row.DigitalDossierId);
        Assert.IsTrue((await handler.AssignLegacyOwnerAsync(_f.LegacyFolder.Id, _f.Owner, default)).IsFailure);
        _f.Scope = _f.Scope with { Unrestricted = true }; _f.GlobalWrite = true;
        Assert.IsTrue((await handler.AssignLegacyOwnerAsync(_f.LegacyFolder.Id, _f.Owner, default)).IsSuccess);
    }

    [TestMethod] public async Task DepartmentFilter_IncludesChildUnits_ButNotAnotherDepartment()
    {
        var child = Document.Create("Şube belgesi", DateTimeOffset.UtcNow); child.AssignOwnerUnit(_f.Child, _f.Path + "CHILD/");
        _f.Get<DocumentsDbContext>().Add(child); await _f.Get<DocumentsDbContext>().SaveChangesAsync();
        var docs = await _f.Get<IDocumentQueries>().GetPageAsync(Page, new(OwnerUnitId: _f.Owner), DocumentListSort.TitleAscending, _f.Scope, default);
        Assert.AreEqual(2L, docs.TotalCount);
        Assert.IsFalse(docs.Items.Any(d => d.OwnerUnitId == _f.Other));
    }
}
