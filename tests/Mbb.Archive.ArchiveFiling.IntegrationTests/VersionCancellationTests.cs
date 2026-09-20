using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Documents.CancelVersion;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass]
public sealed class VersionCancellationTests
{
    private static async Task<FilingFixture> Setup()
    {
        var f = new FilingFixture(); await f.Initialize();
        f.Permissions = ["documents.versions.cancel"];
        for (var n=1; n<=3; n++) f.Document.AddVersion($"cancel-test/{n}",new string((char)('a'+n),64),"application/pdf",100,"test", "İlk nüsha",DateTimeOffset.UtcNow);
        await f.Get<DocumentsDbContext>().SaveChangesAsync(); return f;
    }
    private static CancelDocumentVersion Request(FilingFixture f, int? replacement = null) => new(f.Document.ConcurrencyVersion,Guid.NewGuid(),"Yanlış nüsha",replacement);
    [TestMethod]
    public async Task Cancellation_PersistsMetadataCurrentSelectionAndExactlyOneOutboxEvent()
    {
        await using var f = await Setup(); var request = Request(f,1);
        var handler = f.Get<CancelDocumentVersionHandler>();
        Assert.IsTrue((await handler.Handle(f.Document.Id.Value,3,request,default)).IsSuccess);
        Assert.IsTrue((await handler.Handle(f.Document.Id.Value,3,request,default)).IsSuccess);
        var db = f.Get<DocumentsDbContext>(); db.ChangeTracker.Clear();
        var doc = await db.Set<Document>().Include(d=>d.Versions).SingleAsync(d=>d.Id==f.Document.Id);
        Assert.AreEqual(1,doc.CurrentVersionNumber); Assert.AreEqual(3,doc.Versions.Count);
        Assert.AreEqual("test",doc.Versions.Single(v=>v.VersionNumber==3).CancelledBy);
        var events = await db.Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM documents.outbox_messages WHERE event_name = 'documents.version-cancelled.v1' AND payload::jsonb->>'requestId' = {request.RequestId.ToString()}").SingleAsync();
        Assert.AreEqual(1,events);
        var queries = f.Get<IDocumentQueries>();
        Assert.AreEqual(1,(await queries.GetLatestVersionContentAsync(doc.Id.Value,f.Scope,default))!.VersionNumber);
        Assert.AreEqual(3,(await queries.GetVersionContentAsync(doc.Id.Value,3,f.Scope,default))!.VersionNumber);
        Assert.IsNotNull((await queries.GetVersionsAsync(doc.Id.Value,f.Scope,default)).Single(v=>v.VersionNumber==3).CancelledAt);
        var catalog = f.Get<IArchiveFilingCatalog>();
        Assert.AreEqual(doc.Versions.Single(v=>v.VersionNumber==1).Id,(await catalog.GetDocumentAsync(doc.Id.Value,default))!.LatestVersionId);
    }
    [TestMethod]
    public async Task PermissionAndScopeAreRequiredBeforeMutation()
    {
        await using var f = await Setup(); var request=Request(f);
        f.Permissions=[];
        Assert.AreEqual("documents.version_cancel_forbidden",(await f.Get<CancelDocumentVersionHandler>().Handle(f.Document.Id.Value,1,request,default)).Error.Code);
        f.Permissions=["documents.versions.cancel"];
        f.Scope=AccessScope.Empty("test");
        Assert.AreEqual("documents.not_found",(await f.Get<CancelDocumentVersionHandler>().Handle(f.Document.Id.Value,1,request,default)).Error.Code);
        Assert.IsTrue(f.Document.Versions.All(v=>v.CancelledAt is null));
    }
    [TestMethod]
    public async Task StaleRequestAndArchivedDocumentAreRejected()
    {
        await using var f = await Setup(); var request=Request(f);
        f.Document.ChangeTitle("Değişti"); await f.Get<DocumentsDbContext>().SaveChangesAsync();
        Assert.AreEqual("documents.version_cancel_conflict",(await f.Get<CancelDocumentVersionHandler>().Handle(f.Document.Id.Value,1,request,default)).Error.Code);
        f.Document.Archive(DateTimeOffset.UtcNow); await f.Get<DocumentsDbContext>().SaveChangesAsync();
        Assert.IsTrue((await f.Get<CancelDocumentVersionHandler>().Handle(f.Document.Id.Value,1,Request(f),default)).IsFailure);
        Assert.IsTrue(f.Document.Versions.All(v=>v.CancelledAt is null));
    }
    [TestMethod]
    public async Task ConcurrentDatabaseUpdateCannotBeOverwritten()
    {
        await using var f = await Setup(); var request=Request(f);
        using var otherScope=f.Provider.CreateScope();
        var db=otherScope.ServiceProvider.GetRequiredService<DocumentsDbContext>();
        var other=await db.Set<Document>().SingleAsync(d=>d.Id==f.Document.Id);
        other.ChangeTitle("Başka oturum"); await db.SaveChangesAsync();
        Assert.AreEqual("documents.version_cancel_conflict",(await f.Get<CancelDocumentVersionHandler>().Handle(f.Document.Id.Value,1,request,default)).Error.Code);
        db.ChangeTracker.Clear(); var saved=await db.Set<Document>().Include(d=>d.Versions).SingleAsync(d=>d.Id==f.Document.Id);
        Assert.IsTrue(saved.Versions.All(v=>v.CancelledAt is null));
        Assert.AreEqual("Başka oturum",saved.Title);
    }
}
