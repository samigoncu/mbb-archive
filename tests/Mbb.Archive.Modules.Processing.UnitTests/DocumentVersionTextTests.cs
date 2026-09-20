using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Application.Previews;
using Mbb.Archive.Modules.Processing.Contracts;
namespace Mbb.Archive.Modules.Processing.UnitTests;
[TestClass]
public sealed class DocumentVersionTextTests
{
    [TestMethod]
    public async Task HistoricalTextUsesExactVersionArtifactRatherThanCurrentSearchProjection()
    {
        var f=new Fixture();var result=await f.Handler.Handle(f.Document,1,default);
        Assert.IsTrue(result.IsSuccess);Assert.AreEqual("Eski sürümün metni",result.Value.Text);Assert.AreEqual(1,result.Value.VersionNumber);
        Assert.AreEqual(f.OldVersion,f.RequestedVersion);Assert.AreEqual("versions/old/text.txt",f.ReadKey);
    }
    [TestMethod]
    public async Task InvisibleAndMissingVersionsDoNotReadAnyArtifactOrFallBack()
    {
        var f=new Fixture { Visible=false };Assert.AreEqual(ErrorType.NotFound,(await f.Handler.Handle(f.Document,1,default)).Error.Type);
        f.Visible=true;Assert.AreEqual(ErrorType.NotFound,(await f.Handler.Handle(f.Document,99,default)).Error.Type);
        Assert.AreEqual(ErrorType.Validation,(await f.Handler.Handle(f.Document,0,default)).Error.Type);Assert.AreEqual(0,f.Reads);
    }
    [TestMethod]
    public async Task UnproducedTextDiffersFromMissingStoredArtifact()
    {
        var f=new Fixture { HasArtifact=false };var unavailable=await f.Handler.Handle(f.Document,1,default);
        Assert.IsTrue(unavailable.IsSuccess);Assert.IsFalse(unavailable.Value.HasText);Assert.AreEqual(0,f.Reads);
        f.HasArtifact=true;f.StorageMissing=true;Assert.AreEqual(ErrorType.Conflict,(await f.Handler.Handle(f.Document,1,default)).Error.Type);
    }
    [TestMethod]
    public async Task LargeTextIsBoundedAndExplicitlyTruncated()
    {
        var f=new Fixture { Text=new string('x',DocumentVersionTextHandler.MaximumCharacters+20) };
        var result=(await f.Handler.Handle(f.Document,1,default)).Value;
        Assert.IsTrue(result.IsTruncated);Assert.AreEqual(DocumentVersionTextHandler.MaximumCharacters,result.Text.Length);
    }
    private sealed class Fixture:IArchiveFilingCatalog,IProcessedVersionArtifacts,IPreviewArtifactStore
    {
        public Guid Document=Guid.NewGuid(),OldVersion=Guid.NewGuid(),CurrentVersion=Guid.NewGuid();public bool Visible=true,HasArtifact=true,StorageMissing;
        public string Text="Eski sürümün metni";public int Reads;public string? ReadKey;public Guid? RequestedVersion;
        public DocumentVersionTextHandler Handler=>new(this,this,this);
        public Task<FilingDocument?> GetDocumentAsync(Guid id,CancellationToken ct)=>Task.FromResult<FilingDocument?>(Visible&&id==Document?new(id,Guid.NewGuid(),null,null,CurrentVersion):null);
        public Task<Guid?> GetDocumentVersionIdAsync(Guid id,int version,CancellationToken ct)=>Task.FromResult<Guid?>(Visible&&id==Document&&version==1?OldVersion:null);
        public Task<FilingDossier?> GetDossierAsync(Guid id,CancellationToken ct)=>Task.FromResult<FilingDossier?>(null);
        public Task<ProcessedVersionArtifacts?> GetAsync(Guid documentId,Guid versionId,CancellationToken ct)
        {RequestedVersion=versionId;return Task.FromResult<ProcessedVersionArtifacts?>(HasArtifact?new("versions/old/text.txt",null):null);}
        public Task<Stream?> OpenReadAsync(string key,CancellationToken ct)
        {Reads++;ReadKey=key;return Task.FromResult<Stream?>(StorageMissing?null:new MemoryStream(Encoding.UTF8.GetBytes(Text)));}
    }
}
