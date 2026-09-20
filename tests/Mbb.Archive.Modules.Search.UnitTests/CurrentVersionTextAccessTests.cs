using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Contracts;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence;
namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class CurrentVersionTextAccessTests
{
    [TestMethod]
    public async Task HiddenDocument_DoesNotResolveAnyTextOrOcrArtifacts()
    {
        using var db = new SearchDbContext(new DbContextOptionsBuilder<SearchDbContext>().Options);
        var source = new Source { Visible = false };
        var queries = new EfSearchDocumentRepository(db, source, source);
        Assert.IsNull(await queries.GetTextStorageKeyAsync(source.DocumentId, default));
        Assert.IsNull(await queries.GetOcrJsonStorageKeyAsync(source.DocumentId, default));
        Assert.AreEqual(0, source.Lookups);
    }
    [TestMethod]
    public async Task TextAndHighlights_FollowTheScopedCurrentVersion()
    {
        using var db = new SearchDbContext(new DbContextOptionsBuilder<SearchDbContext>().Options);
        var source = new Source();
        var queries = new EfSearchDocumentRepository(db, source, source);
        Assert.AreEqual("current-text", await queries.GetTextStorageKeyAsync(source.DocumentId, default));
        Assert.AreEqual("current-ocr", await queries.GetOcrJsonStorageKeyAsync(source.DocumentId, default));
        Assert.AreEqual(2, source.Lookups);
    }
    private sealed class Source : IArchiveFilingCatalog, IProcessedVersionArtifacts
    {
        public Guid DocumentId=Guid.NewGuid(); public Guid CurrentVersion=Guid.NewGuid();
        public bool Visible=true; public int Lookups;
        public Task<FilingDocument?> GetDocumentAsync(Guid id,CancellationToken ct)
            =>Task.FromResult<FilingDocument?>(Visible && id==DocumentId ? new(id,Guid.NewGuid(),null,null,CurrentVersion):null);
        public Task<FilingDossier?> GetDossierAsync(Guid id,CancellationToken ct)=>throw new NotSupportedException();
        public Task<Guid?> GetDocumentVersionIdAsync(Guid id,int versionNumber,CancellationToken ct)=>throw new NotSupportedException();
        public Task<ProcessedVersionArtifacts?> GetAsync(Guid id,Guid versionId,CancellationToken ct)
        { Assert.AreEqual(DocumentId,id); Assert.AreEqual(CurrentVersion,versionId); Lookups++;return Task.FromResult<ProcessedVersionArtifacts?>(new("current-text","current-ocr")); }
    }
}
