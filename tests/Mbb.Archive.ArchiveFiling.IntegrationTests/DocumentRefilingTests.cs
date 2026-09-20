using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Classification.Infrastructure.Persistence;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass, DoNotParallelize]
public sealed class DocumentRefilingTests
{
    private FilingFixture _f = null!;
    private DigitalDossier _target = null!;
    private PhysicalFolder _folder = null!;
    [TestInitialize] public async Task Initialize()
    {
        _f = new(); await _f.Initialize(true); _f.Permissions = ["physical-archive.manage"];
        var now = DateTimeOffset.UtcNow;
        _target = DigitalDossier.Create(_f.Owner, _f.Plan, _f.AlternateItem, "2026-v1", "TEST.02", "İkinci konu", "Hedef dosya", 2026, now);
        var docs = _f.Get<DocumentsDbContext>(); docs.Add(_target);
        _f.Document.SetFilePlanCode("TEST.01");
        _f.Document.AddVersion("original/test.pdf", new string('a',64), "application/pdf", 512, "test", null, now);
        _f.Document.Archive(now); await docs.SaveChangesAsync();
        var classification = _f.Get<ClassificationDbContext>();
        classification.Add(DocumentClassification.Create(_f.Document.Id.Value, new FilePlanId(_f.Plan), new FilePlanItemId(_f.Item), true, now));
        await classification.SaveChangesAsync();
        _folder = PhysicalFolder.Register(Guid.NewGuid().ToString(), "Hedef fiziksel", "TEST.02", _f.Shelf, _f.ShelfType, now);
        _folder.AssignOwnership(_f.Owner, _target.Id);
        var physical = _f.Get<PhysicalArchiveDbContext>(); physical.Add(_folder); await physical.SaveChangesAsync();
    }
    [TestCleanup] public async Task Cleanup() { if (_f is not null) await _f.DisposeAsync(); }
    private ChangeDocumentFiling Request(long? version = null) => new(version ?? _f.Document.ConcurrencyVersion,
        _target.Id, _f.Plan, _f.AlternateItem, [_f.Folder.Id], [_folder.Id], "Yanlış dosyalamayı düzeltme");

    [TestMethod] public async Task ArchivedDocument_MovesAllAssignments_AndPreservesOriginal()
    {
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request(), default);
        Assert.IsTrue(result.IsSuccess, result.IsFailure ? result.Error.Description : "");
        using var read = _f.Provider.CreateScope();
        var doc = await read.ServiceProvider.GetRequiredService<DocumentsDbContext>().Set<Document>().Include(d => d.Versions).SingleAsync(d => d.Id == _f.Document.Id);
        Assert.AreEqual(_target.Id, doc.DossierId); Assert.AreEqual("TEST.02", doc.FilePlanCode);
        Assert.AreEqual(DocumentStatus.Archived, doc.Status); Assert.AreEqual(new string('a',64), doc.Versions.Single().Sha256Hash);
        var links = await read.ServiceProvider.GetRequiredService<PhysicalArchiveDbContext>().Set<PhysicalFolderDocument>().Where(d => d.DocumentId == doc.Id.Value).ToListAsync();
        CollectionAssert.AreEquivalent(new[] { _folder.Id }, links.Select(d => d.FolderId).ToArray());
        var primary = await read.ServiceProvider.GetRequiredService<ClassificationDbContext>().Set<DocumentClassification>().SingleAsync(d => d.DocumentId == doc.Id.Value && d.IsPrimary);
        Assert.AreEqual(_f.AlternateItem, primary.FilePlanItemId.Value);
    }
    [TestMethod] public async Task MissingTargetFolder_RollsBackDocumentClassificationAndOutboxes()
    {
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request() with { FolderIds = [Guid.NewGuid()] }, default);
        Assert.IsTrue(result.IsFailure); await AssertUnchanged();
        using var read = _f.Provider.CreateScope();
        var count = await read.ServiceProvider.GetRequiredService<ClassificationDbContext>().Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM classification.outbox_messages WHERE payload::jsonb->>'documentId' = {_f.Document.Id.Value.ToString()}").SingleAsync();
        Assert.AreEqual(0, count);
    }
    [TestMethod] public async Task StaleVersion_IsRejectedWithoutMovingAnything()
    {
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request(1), default);
        Assert.IsTrue(result.IsFailure); await AssertUnchanged();
    }
    [TestMethod] public async Task OtherUnitFolder_IsRejectedAndRolledBack()
    {
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request() with { FolderIds = [_f.OtherFolder.Id] }, default);
        Assert.IsTrue(result.IsFailure); await AssertUnchanged();
    }
    [TestMethod] public async Task MissingPhysicalPermission_IsRejectedAndRolledBack()
    {
        _f.Permissions = [];
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request(), default);
        Assert.IsTrue(result.IsFailure); await AssertUnchanged();
    }
    [TestMethod] public async Task LoanedSourceFolder_IsRejectedAndRolledBack()
    {
        _f.Folder.CheckOut(); await _f.Get<PhysicalArchiveDbContext>().SaveChangesAsync();
        using var scope = _f.Provider.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<DocumentFilingHandler>().ChangeAsync(_f.Document.Id.Value, Request(), default);
        Assert.IsTrue(result.IsFailure); await AssertUnchanged();
    }
    private async Task AssertUnchanged()
    {
        using var read = _f.Provider.CreateScope();
        var doc = await read.ServiceProvider.GetRequiredService<DocumentsDbContext>().Set<Document>().SingleAsync(d => d.Id == _f.Document.Id);
        Assert.AreEqual(_f.Dossier.Id, doc.DossierId); Assert.AreEqual("TEST.01", doc.FilePlanCode);
        var links = await read.ServiceProvider.GetRequiredService<PhysicalArchiveDbContext>().Set<PhysicalFolderDocument>().Where(d => d.DocumentId == _f.Document.Id.Value).ToListAsync();
        CollectionAssert.AreEquivalent(new[] { _f.Folder.Id }, links.Select(d => d.FolderId).ToArray());
        var primary = await read.ServiceProvider.GetRequiredService<ClassificationDbContext>().Set<DocumentClassification>().SingleAsync(d => d.DocumentId == _f.Document.Id.Value && d.IsPrimary);
        Assert.AreEqual(_f.Item, primary.FilePlanItemId.Value);
    }
}
