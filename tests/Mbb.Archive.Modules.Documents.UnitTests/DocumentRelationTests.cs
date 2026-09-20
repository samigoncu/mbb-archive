using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.Modules.Documents.Application.Relations;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Relations;
namespace Mbb.Archive.Modules.Documents.UnitTests;
[TestClass]
public sealed class DocumentRelationTests
{
    [TestMethod]
    public async Task InvisibleTargetAndReadOnlySourceCannotCreateRelations()
    {
        var f=new Fixture(); f.Visible.Remove(f.Target);
        Assert.AreEqual(ErrorType.NotFound,(await f.Handler.Create(f.Source,new(f.Target,"Related","Gerekçe",0),default)).Error.Type);
        f.Visible.Add(f.Target); f.Writable=false;
        Assert.IsTrue((await f.Handler.Create(f.Source,new(f.Target,"Related","Gerekçe",0),default)).IsFailure);
        Assert.AreEqual(0,f.Rows.Count); Assert.AreEqual(0,f.Events.Count); Assert.AreEqual(0,f.Saves);
    }
    [TestMethod]
    public async Task CreateUpdateRemovePreservesRelationAndAuditAndRejectsStaleChanges()
    {
        var f=new Fixture(); var created=await f.Handler.Create(f.Source,new(f.Target,"Attachment","Ek nüsha",0),default);
        Assert.IsTrue(created.IsSuccess);var row=f.Rows.Single();var version=row.Version;
        Assert.IsTrue((await f.Handler.Update(f.Source,row.Id,new(f.Target,"Related","Yeni açıklama",version),default)).IsSuccess);
        Assert.IsTrue((await f.Handler.Remove(f.Source,row.Id,version,"Yanlış bağlantı",default)).IsFailure);
        Assert.IsNull(row.RemovedAt);
        Assert.IsTrue((await f.Handler.Remove(f.Source,row.Id,row.Version,"Yanlış bağlantı",default)).IsSuccess);
        Assert.IsNotNull(row.RemovedAt); Assert.AreEqual(1,f.Rows.Count);Assert.AreEqual(3,f.Events.Count);
        var audit=(DocumentRelationChanged)f.Events.Last();Assert.AreEqual("removed",audit.Operation);Assert.AreEqual("operator",audit.Actor);
        Assert.AreEqual("Yanlış bağlantı",audit.Note);Assert.AreEqual(f.Source,audit.DocumentId);Assert.AreEqual(f.Target,audit.RelatedDocumentId);
    }
    [TestMethod]
    public async Task SelfDuplicateWrongSourceAndTargetReplacementAreRejected()
    {
        var f=new Fixture();
        Assert.IsTrue((await f.Handler.Create(f.Source,new(f.Source,"Related","Kendi",0),default)).IsFailure);
        await f.Handler.Create(f.Source,new(f.Target,"Related","Bağlantı",0),default);var row=f.Rows.Single();
        Assert.AreEqual(ErrorType.Conflict,(await f.Handler.Create(f.Source,new(f.Target,"Related","Tekrar",0),default)).Error.Type);
        Assert.IsTrue((await f.Handler.Remove(f.Target,row.Id,row.Version,"Gerekçe",default)).IsFailure);
        Assert.IsTrue((await f.Handler.Update(f.Source,row.Id,new(f.Source,"Related","Değiştir",row.Version),default)).IsFailure);
        Assert.AreEqual(1,f.Saves);Assert.AreEqual(f.Target,row.TargetDocumentId);
    }
    [TestMethod]
    public async Task ReadHidesRelationsWhoseOtherDocumentBecameInvisible()
    {
        var f=new Fixture();await f.Handler.Create(f.Source,new(f.Target,"PreviousDecision","Dayanak",0),default);
        Assert.AreEqual(1,(await f.Handler.List(f.Source,default)).Value.Count);
        f.Visible.Remove(f.Target);Assert.AreEqual(0,(await f.Handler.List(f.Source,default)).Value.Count);
        Assert.AreEqual(ErrorType.NotFound,(await f.Handler.List(f.Target,default)).Error.Type);
    }
    private sealed class Fixture : IDocumentRelations,IArchiveFilingCatalog,IArchiveUnitDirectory,IDocumentVisibility,ICurrentUserPermissions,IUnitOfWork<DocumentsBoundary>,IOutbox<DocumentsBoundary>
    {
        public readonly Guid Source=Guid.NewGuid(),Target=Guid.NewGuid(),Unit=Guid.NewGuid();
        public HashSet<Guid> Visible;public bool Writable=true;public List<DocumentRelation> Rows=[];public List<IIntegrationEvent> Events=[];public int Saves;
        public Fixture(){Visible=[Source,Target];}
        public DocumentRelationsHandler Handler=>new(this,this,this,this,this,this,this,TimeProvider.System);
        public Task<IReadOnlyList<DocumentRelation>> ListAsync(Guid id,CancellationToken ct)=>Task.FromResult<IReadOnlyList<DocumentRelation>>(Rows.Where(x=>x.RemovedAt is null&&(x.SourceDocumentId==id||x.TargetDocumentId==id)).ToArray());
        public Task<DocumentRelation?> GetAsync(Guid id,CancellationToken ct)=>Task.FromResult(Rows.SingleOrDefault(x=>x.Id==id&&x.RemovedAt is null));
        public Task<bool> ExistsAsync(Guid source,Guid target,string kind,Guid? except,CancellationToken ct)=>Task.FromResult(Rows.Any(x=>x.SourceDocumentId==source&&x.TargetDocumentId==target&&x.Kind==kind&&x.Id!=except&&x.RemovedAt is null));
        public Task AddAsync(DocumentRelation relation,CancellationToken ct){Rows.Add(relation);return Task.CompletedTask;}
        public Task<FilingDocument?> GetDocumentAsync(Guid id,CancellationToken ct)=>Task.FromResult<FilingDocument?>(Visible.Contains(id)?new(id,Unit,null,null,null):null);
        public Task<Guid?> GetDocumentVersionIdAsync(Guid id,int version,CancellationToken ct)=>Task.FromResult<Guid?>(null);
        public Task<FilingDossier?> GetDossierAsync(Guid id,CancellationToken ct)=>Task.FromResult<FilingDossier?>(null);
        public Task<IReadOnlyList<ArchiveUnit>> GetVisibleAsync(CancellationToken ct)=>Task.FromResult<IReadOnlyList<ArchiveUnit>>([]);
        public Task<ArchiveUnit?> ResolveWritableAsync(Guid? id,string permission,CancellationToken ct)=>Task.FromResult<ArchiveUnit?>(Writable&&id==Unit?new(Unit,"Birim","/B/",null,true,true,true,true):null);
        public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids,CancellationToken ct)=>Task.FromResult<IReadOnlySet<Guid>>(ids.Where(Visible.Contains).ToHashSet());
        public string Subject=>"operator";public IReadOnlyCollection<string> Groups=>[];
        public Task<bool> HasAllPermissionsAsync(CancellationToken ct)=>Task.FromResult(false);
        public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken ct)=>Task.FromResult<IReadOnlyCollection<string>>(["documents.write"]);
        public void Enqueue(IIntegrationEvent e)=>Events.Add(e);
        public Task<int> SaveChangesAsync(CancellationToken ct=default){Saves++;return Task.FromResult(1);}
    }
}
