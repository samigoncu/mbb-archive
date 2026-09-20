using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Artifacts;
using Mbb.Archive.Modules.Search.Infrastructure.Indexing;
namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class CurrentVersionIndexTests
{
    [TestMethod]
    public async Task StaleProjection_CannotIndexCancelledVersionContent()
    {
        var fixture = new Source();
        var projection=SearchDocument.Create(Guid.NewGuid(),"Belge",DateTimeOffset.UtcNow);
        projection.ApplyProcessing(Guid.NewGuid(),"image/png","cancelled-text","cancelled-ocr",DateTimeOffset.UtcNow);
        var result=await new SearchIndexDocumentFactory(fixture,fixture,fixture).CreateAsync(projection,default);
        Assert.AreEqual(fixture.Current.VersionId,result.DocumentVersionId);
        Assert.AreEqual("application/pdf",result.MimeType);
        CollectionAssert.AreEqual(new[]{"valid-text"},fixture.ReadKeys.ToArray());
    }
    private sealed class Source : ISearchArtifactStore, IDocumentSearchDatesProvider, ICurrentVersionProjectionSource
    {
        public CurrentVersionProjection Current = new(Guid.NewGuid(),"application/pdf","valid-text",null);
        public List<string> ReadKeys=[];
        public Task<CurrentVersionProjection?> GetAsync(Guid id,CancellationToken ct)=>Task.FromResult<CurrentVersionProjection?>(Current);
        Task<DocumentSearchDates?> IDocumentSearchDatesProvider.GetAsync(Guid id,CancellationToken ct)=>Task.FromResult<DocumentSearchDates?>(new(DateTimeOffset.UtcNow,null));
        public Task<string> ReadTextAsync(string key,CancellationToken ct){ReadKeys.Add(key);return Task.FromResult("Geçerli metin");}
        public Task<byte[]> ReadBytesAsync(string key,CancellationToken ct)=>throw new AssertFailedException("Cancelled OCR should never be read.");
    }
}
