using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
namespace Mbb.Archive.Modules.Search.UnitTests;
[TestClass]
public sealed class DiscoverySearchTests
{
    [TestMethod]
    [DataRow("title_asc","title.raw","asc")]
    [DataRow("newest","ingestedAt","desc")]
    public void SortingHasStableTieBreakAndRetainsScope(string sort,string field,string order)
    {
        using var body=JsonDocument.Parse(OpenSearchHttpClient.BuildSearchBody(new SearchRequest("",2,12,null,null,null,null,new AccessScope("reader",false,["/A/"],[],[],[]),Sort:sort)));
        Assert.AreEqual(order,body.RootElement.GetProperty("sort")[0].GetProperty(field).GetProperty("order").GetString());
        Assert.IsTrue(body.RootElement.GetProperty("sort")[1].TryGetProperty("documentId",out _));
        Assert.AreEqual(12,body.RootElement.GetProperty("from").GetInt32());
        StringAssert.Contains(body.RootElement.GetProperty("query").GetRawText(),"/A/");
    }
    [TestMethod]
    public async Task InvalidSortCannotReachSearch()
    {
        var handler=new SearchDocumentsQueryHandler(new NeverSearch(),new EmptyScope());
        var result=await handler.Handle(new SearchDocumentsQuery("",Sort:"body.script"),default);
        Assert.AreEqual("search.invalid_sort",result.Error.Code);
    }
    [TestMethod]
    public async Task LiveIndex_ScopesHitsTotalsFacetsAndGrantsBeforePaging()
    {
        var url=Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_OPENSEARCH");
        if(string.IsNullOrWhiteSpace(url))Assert.Inconclusive("Set MBB_ARCHIVE_TEST_OPENSEARCH for isolated live search verification.");
        var name="mbb-archive-discovery-tests-"+Guid.NewGuid().ToString("N");
        using var http=new HttpClient();var client=new OpenSearchHttpClient(http,Options.Create(new OpenSearchOptions{BaseUrl=url!,IndexName=name}));
        var a=Guid.NewGuid();var b=Guid.NewGuid();var now=DateTimeOffset.UtcNow;
        try
        {
            await client.IndexAsync(new(a,Guid.NewGuid(),"A visible","application/pdf","shared",[],["plan:010"],[],[],[],"/A/",null,null,1,now,now,now),default);
            await client.IndexAsync(new(b,Guid.NewGuid(),"B private","image/jpeg","shared",[],["plan:999"],[],[],[],"/B/",null,null,1,now,now,now),default);
            using(var refresh=await http.PostAsync(name+"/_refresh",null))refresh.EnsureSuccessStatusCode();
            var request=new SearchRequest("shared",1,1,null,null,null,null,new AccessScope("reader",false,["/A/"],[],[],[]),Sort:"title_asc");
            var own=await client.SearchAsync(request,default);
            Assert.AreEqual(1L,own.Total);Assert.AreEqual(a,own.Hits.Single().DocumentId);
            Assert.AreEqual("application/pdf",own.MimeTypes.Single().Key);Assert.AreEqual("plan:010",own.FilePlanCodes.Single().Key);
            var empty=await client.SearchAsync(request with {Scope=AccessScope.Empty("reader")},default);
            Assert.AreEqual(0L,empty.Total);Assert.AreEqual(0,empty.MimeTypes.Count);Assert.AreEqual(0,empty.FilePlanCodes.Count);
            var granted=await client.SearchAsync(request with {Scope=new AccessScope("reader",false,[],[],[b],[])},default);
            Assert.AreEqual(1L,granted.Total);Assert.AreEqual(b,granted.Hits.Single().DocumentId);
            var cancelled=await client.SearchAsync(request with {ExcludedDocumentIds=[a]},default);
            Assert.AreEqual(0L,cancelled.Total);Assert.AreEqual(0,cancelled.MimeTypes.Count);
        }
        finally { using var deleted=await http.DeleteAsync(name);deleted.EnsureSuccessStatusCode(); }
    }
    [TestMethod]
    public async Task LivePrefix_MatchesTurkishPartialWordsWithoutTyposOrScopeLeaks()
    {
        var url=Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_OPENSEARCH");
        if(string.IsNullOrWhiteSpace(url))Assert.Inconclusive("Isolated OpenSearch required.");
        var name="mbb-archive-prefix-tests-"+Guid.NewGuid().ToString("N");
        using var http=new HttpClient();var client=new OpenSearchHttpClient(http,Options.Create(new OpenSearchOptions{BaseUrl=url!,IndexName=name}));
        var a=Guid.NewGuid();var b=Guid.NewGuid();var now=DateTimeOffset.UtcNow;
        try {
            await client.IndexAsync(new(a,Guid.NewGuid(),"Merkez Kütüphanesi","application/pdf","hal yolu",[],[],[],[],[],"/A/",null,null,1,now,now,now),default);
            await client.IndexAsync(new(b,Guid.NewGuid(),"Kütüphane özel belge","application/pdf","hava hatları yıl",[],[],[],[],[],"/B/",null,null,1,now,now,now),default);
            using(var refresh=await http.PostAsync(name+"/_refresh",null))refresh.EnsureSuccessStatusCode();
            var request=new SearchRequest("kütüp",1,25,null,null,null,null,new AccessScope("reader",false,["/A/"],[],[],[]));
            foreach(var query in new[]{"kütüp","KÜTÜP","merkez kütüp","kütüphane"}) {
                var result=await client.SearchAsync(request with{Query=query},default);
                Assert.AreEqual(1L,result.Total,query);Assert.AreEqual(a,result.Hits.Single().DocumentId);
                Assert.IsTrue(result.Hits.Single().Fragments.Any(fragment=>fragment.Contains("<mark>")),query);
            }
            Assert.AreEqual(0L,(await client.SearchAsync(request with{Query="merkez hastane kütüp"},default)).Total);
            Assert.AreEqual(0L,(await client.SearchAsync(request with{Query="hal yolu",Scope=new AccessScope("reader",false,["/B/"],[],[],[])},default)).Total);
            Assert.AreEqual(0L,(await client.SearchAsync(request with{Scope=AccessScope.Empty("none")},default)).Total);
        } finally {using var deleted=await http.DeleteAsync(name);deleted.EnsureSuccessStatusCode();}
    }
    private sealed class EmptyScope:ICurrentUserScope { public Task<AccessScope> GetAsync(CancellationToken ct)=>Task.FromResult(AccessScope.Empty("reader")); }
    private sealed class NeverSearch:ISearchGateway { public Task<SearchResponse> SearchAsync(SearchRequest r,CancellationToken ct)=>throw new AssertFailedException("Gateway must not run."); }
}
