using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class CancelledDocumentSearchTests
{
    [TestMethod]
    public async Task CancellationIsAppliedBeforePagingAndRefreshesOnRestore()
    {
        var id=Guid.NewGuid();var exclusions=new Exclusions { Ids=[id] };
        var transport=new Transport();using var http=new HttpClient(transport);
        var gateway=new ActiveDocumentSearchGateway(new OpenSearchHttpClient(http,Options.Create(new OpenSearchOptions())),exclusions);
        var request=new SearchRequest("test",2,25,null,null,null,null,new AccessScope("test",true,[],[],[],[]));
        await gateway.SearchAsync(request,default);
        using(var body=JsonDocument.Parse(transport.Bodies[0]))
        {
            var excluded=body.RootElement.GetProperty("query").GetProperty("bool").GetProperty("must_not");
            Assert.AreEqual(id.ToString("D"),excluded[0].GetProperty("terms").GetProperty("documentId")[0].GetString());
            Assert.AreEqual(25,body.RootElement.GetProperty("from").GetInt32());
        }
        exclusions.Ids=[];
        await gateway.SearchAsync(request,default);
        Assert.IsFalse(transport.Bodies[1].Contains(id.ToString("D")));
        Assert.AreEqual(2,exclusions.Reads);
    }

    private sealed class Exclusions : IDocumentSearchExclusions
    {
        public IReadOnlyList<Guid> Ids { get; set; }=[];
        public int Reads { get; private set; }
        public Task<IReadOnlyList<Guid>> GetAsync(CancellationToken ct) { Reads++;return Task.FromResult(Ids); }
    }
    private sealed class Transport : HttpMessageHandler
    {
        public List<string> Bodies { get; }=[];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct)
        {
            if(request.Method==HttpMethod.Post)
            {
                Bodies.Add(await request.Content!.ReadAsStringAsync(ct));
                return new(HttpStatusCode.OK) { Content=new StringContent("""{"hits":{"total":{"value":0},"hits":[]},"aggregations":{}}""") };
            }
            return new(HttpStatusCode.OK) { Content=new StringContent("{}") };
        }
    }
}
