using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Documents.Cancel;
using Mbb.Archive.Modules.Documents.Application.Documents.List;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass]
public sealed class DocumentCancellationTests
{
    private static async Task<FilingFixture> Setup()
    {
        var f = new FilingFixture(); await f.Initialize(); f.Permissions=["documents.cancel"];
        f.Document.AddVersion("cancel-doc",new string('a',64),"application/pdf",100,"test",null,DateTimeOffset.UtcNow);
        await f.Get<DocumentsDbContext>().SaveChangesAsync();return f;
    }
    private static ChangeDocumentCancellation Request(FilingFixture f)=>new(f.Document.ConcurrencyVersion,Guid.NewGuid(),"Yanlış yükleme");
    [TestMethod] public async Task CancelAndRestore_FilterListsRelationsAndSearch_KeepHistoryAndOutbox()
    {
        await using var f=await Setup();var request=Request(f);var id=f.Document.Id.Value;
        var handler=f.Get<DocumentCancellationHandler>();
        Assert.IsTrue((await handler.Handle(id,true,request,default)).IsSuccess);
        Assert.IsTrue((await handler.Handle(id,true,request,default)).IsSuccess);
        var query=f.Get<IDocumentQueries>();var page=PageRequest.Create(1,100).Value;
        Assert.IsFalse((await query.GetPageAsync(page,new(),DocumentListSort.CreatedAtDescending,f.Scope,default)).Items.Any(d=>d.Id==id));
        Assert.IsTrue((await query.GetPageAsync(page,new(Status:"Cancelled"),DocumentListSort.CreatedAtDescending,f.Scope,default)).Items.Any(d=>d.Id==id));
        Assert.AreEqual("Yanlış yükleme",(await query.GetByIdAsync(id,f.Scope,default))!.CancellationReason);
        Assert.IsNotNull(await query.GetVersionContentAsync(id,1,f.Scope,default));
        Assert.IsNull(await f.Get<IArchiveFilingCatalog>().GetDocumentAsync(id,default));
        Assert.IsTrue((await f.Get<IDocumentSearchExclusions>().GetAsync(default)).Contains(id));
        var originalScope=f.Scope;f.Scope=new("test",true,[],[],[],[]);
        Assert.IsFalse((await f.Get<IDocumentVisibility>().FilterAsync([id],default)).Contains(id));
        var count=await f.Get<DocumentsDbContext>().Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM documents.outbox_messages WHERE event_name = 'documents.cancelled.v1' AND payload::jsonb->>'requestId' = {request.RequestId.ToString()}").SingleAsync();
        Assert.AreEqual(1,count);
        f.Scope=originalScope;
        Assert.IsTrue((await handler.Handle(id,false,Request(f),default)).IsSuccess);
        Assert.IsFalse((await f.Get<IDocumentSearchExclusions>().GetAsync(default)).Contains(id));
        Assert.IsTrue((await f.Get<IDocumentVisibility>().FilterAsync([id],default)).Contains(id));
        Assert.IsTrue((await query.GetPageAsync(page,new(),DocumentListSort.CreatedAtDescending,f.Scope,default)).Items.Any(d=>d.Id==id));
        Assert.AreEqual(new string('a',64),(await query.GetVersionContentAsync(id,1,f.Scope,default))!.Sha256Hash);
    }
    [TestMethod] public async Task PermissionScopeArchiveAndStaleVersionRejectMutation()
    {
        await using var f=await Setup();var request=Request(f);var handler=f.Get<DocumentCancellationHandler>();var id=f.Document.Id.Value;
        f.Permissions=[];Assert.AreEqual("documents.cancel_forbidden",(await handler.Handle(id,true,request,default)).Error.Code);
        f.Permissions=["documents.cancel"];var scope=f.Scope;f.Scope=AccessScope.Empty("test");
        Assert.AreEqual("documents.not_found",(await handler.Handle(id,true,request,default)).Error.Code);
        f.Scope=scope;f.Document.ChangeTitle("Değişti");await f.Get<DocumentsDbContext>().SaveChangesAsync();
        Assert.AreEqual("documents.cancel_conflict",(await handler.Handle(id,true,request,default)).Error.Code);
        f.Document.Archive(DateTimeOffset.UtcNow);await f.Get<DocumentsDbContext>().SaveChangesAsync();
        Assert.AreEqual("documents.cancel_conflict",(await handler.Handle(id,true,Request(f),default)).Error.Code);
        Assert.AreEqual(DocumentStatus.Archived,f.Document.Status);
    }
    [TestMethod] public async Task ConcurrentCancellationDoesNotOverwriteOtherSession()
    {
        await using var f=await Setup();var request=Request(f);
        using var other=f.Provider.CreateScope();var db=other.ServiceProvider.GetRequiredService<DocumentsDbContext>();
        var doc=await db.Set<Document>().SingleAsync(d=>d.Id==f.Document.Id);doc.ChangeTitle("Diğer oturum");await db.SaveChangesAsync();
        Assert.AreEqual("documents.cancel_conflict",(await f.Get<DocumentCancellationHandler>().Handle(doc.Id.Value,true,request,default)).Error.Code);
        db.ChangeTracker.Clear();doc=await db.Set<Document>().SingleAsync(d=>d.Id==f.Document.Id);
        Assert.AreEqual(DocumentStatus.Draft,doc.Status);Assert.AreEqual("Diğer oturum",doc.Title);
    }
}
