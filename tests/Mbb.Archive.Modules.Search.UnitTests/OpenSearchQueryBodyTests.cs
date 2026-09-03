using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
namespace Mbb.Archive.Modules.Search.UnitTests;
[TestClass] public sealed class OpenSearchQueryBodyTests
{
    private static JsonElement NestedPagesClause(string query)
    {
        var body=OpenSearchHttpClient.BuildSearchBody(new SearchRequest(query,1,25,null,null,null,null));
        using var document=JsonDocument.Parse(body);
        foreach(var clause in document.RootElement.GetProperty("query").GetProperty("bool").GetProperty("should").EnumerateArray())
            if(clause.TryGetProperty("nested",out var nested))return nested.Clone();
        throw new AssertFailedException("nested pages clause not found.");
    }

    // inner_hits query'nin içine kaçarsa OpenSearch 400 parsing_exception döner.
    [TestMethod] public void PagesClause_PlacesInnerHitsAsSiblingOfQuery(){var nested=NestedPagesClause("imar");Assert.IsTrue(nested.TryGetProperty("inner_hits",out _));Assert.IsFalse(nested.GetProperty("query").TryGetProperty("inner_hits",out _));}

    [TestMethod] public void PagesClause_QueryHoldsOnlyMatchClause(){var nested=NestedPagesClause("imar");var properties=0;foreach(var _ in nested.GetProperty("query").EnumerateObject())properties++;Assert.AreEqual(1,properties);Assert.IsTrue(nested.GetProperty("query").TryGetProperty("match",out _));}

    // inner_hits highlight'ı üst seviye ayarı devralmaz; etiketler orada da
    // verilmezse sayfa parçaları <em> ile döner ve arayüzde düz metin görünür.
    [TestMethod] public void PagesClause_UsesMarkTagsInInnerHitsHighlight(){var nested=NestedPagesClause("imar");var tags=nested.GetProperty("inner_hits").GetProperty("highlight");Assert.AreEqual("<mark>",tags.GetProperty("pre_tags")[0].GetString());Assert.AreEqual("</mark>",tags.GetProperty("post_tags")[0].GetString());}

    [TestMethod] public void SearchBody_RendersBoolInsteadOfPlaceholder(){var body=OpenSearchHttpClient.BuildSearchBody(new SearchRequest("imar",1,25,null,null,null,null));Assert.IsFalse(body.Contains("\"bool_\""));Assert.IsTrue(body.Contains("\"bool\""));}
}
