using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class AdvancedSearchTests
{
    [TestMethod]
    public void MetadataExclusion_NegatesEntireNestedEntry()
    {
        using var body = JsonDocument.Parse(OpenSearchHttpClient.BuildSearchBody(new SearchRequest("", 1, 10, null, null, null, null, new AccessScope("test", true, [], [], [], []),
            [new("metadata:evrak.konu", "notContains", "taslak"), new("title", "contains", "imar")])));
        var query = body.RootElement.GetProperty("query").GetProperty("bool");
        var nested = query.GetProperty("must_not")[0].GetProperty("nested");
        Assert.AreEqual("metadataEntries", nested.GetProperty("path").GetString());
        var filters = nested.GetProperty("query").GetProperty("bool").GetProperty("filter");
        Assert.AreEqual("evrak.konu", filters[0].GetProperty("term").GetProperty("metadataEntries.key").GetString());
        Assert.AreEqual("taslak", filters[1].GetProperty("match_phrase").GetProperty("metadataEntries.valueText").GetString());
        Assert.AreEqual(1, query.GetProperty("filter").GetArrayLength());
        Assert.AreEqual(0, query.GetProperty("minimum_should_match").GetInt32());
        Assert.AreEqual(0, query.GetProperty("should").GetArrayLength());
    }

    [TestMethod]
    [DataRow("İmar \"başvuru\" : *")]
    [DataRow("bool_")]
    public void ExactTitle_UsesKeywordFieldAndPreservesLiteralValue(string value)
    {
        using var body = JsonDocument.Parse(OpenSearchHttpClient.BuildSearchBody(new SearchRequest("", 1, 10, null, null, null, null, new AccessScope("test", true, [], [], [], []),
            [new("title", "equals", value)])));
        Assert.AreEqual(value, body.RootElement.GetProperty("query").GetProperty("bool").GetProperty("filter")[0]
            .GetProperty("term").GetProperty("title.raw").GetString());
    }

    [TestMethod]
    public async Task InvalidCondition_RejectsRequestBeforeGateway()
    {
        var gateway = new RecordingGateway();
        var handler = new SearchDocumentsQueryHandler(gateway, new UnrestrictedScope());
        foreach (var condition in new SearchCondition[] { new("body.raw", "equals", "x"), new("mimeType", "contains", "pdf"), new("title", "script", "x"), new("title", "contains", " ") })
        {
            var result = await handler.Handle(new SearchDocumentsQuery("", Conditions: [condition]), CancellationToken.None);
            Assert.IsTrue(result.IsFailure);
        }
        Assert.AreEqual(0, gateway.Calls);
    }

    [TestMethod]
    public async Task FilterOnlySearch_ReachesGateway_ButUnboundedPageDoesNot()
    {
        var gateway = new RecordingGateway();
        var handler = new SearchDocumentsQueryHandler(gateway, new UnrestrictedScope());
        var valid = await handler.Handle(new SearchDocumentsQuery("", Conditions: [new("mimeType", "equals", "application/pdf")]), CancellationToken.None);
        Assert.IsFalse(valid.IsFailure);
        var invalid = await handler.Handle(new SearchDocumentsQuery("imar", Page: int.MaxValue), CancellationToken.None);
        Assert.IsTrue(invalid.IsFailure);
        Assert.AreEqual(1, gateway.Calls);
    }

    private sealed class RecordingGateway : ISearchGateway
    {
        public int Calls { get; private set; }
        public Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(new SearchResponse(0, [], [], []));
        }
    }
}

/// <summary>Kapsam üstü özne; bu testlerin konusu sorgu doğrulaması.</summary>
internal sealed class UnrestrictedScope : ICurrentUserScope
{
    public Task<AccessScope> GetAsync(CancellationToken cancellationToken)
        => Task.FromResult(new AccessScope("test", true, [], [], [], []));
}
