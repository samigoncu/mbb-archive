using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
namespace Mbb.Archive.Modules.Search.UnitTests;
[TestClass] public sealed class OpenSearchQueryBodyTests
{
    private static JsonElement NestedPagesClause(string query)
    {
        var body=OpenSearchHttpClient.BuildSearchBody(new SearchRequest(query,1,25,null,null,null,null,new AccessScope("test", true, [], [], [], [])));
        using var document=JsonDocument.Parse(body);
        foreach(var clause in document.RootElement.GetProperty("query").GetProperty("bool").GetProperty("should").EnumerateArray())
            if(clause.TryGetProperty("nested",out var nested))return nested.Clone();
        throw new AssertFailedException("nested pages clause not found.");
    }

    // inner_hits query'nin içine kaçarsa OpenSearch 400 parsing_exception döner.
    [TestMethod] public void PagesClause_PlacesInnerHitsAsSiblingOfQuery(){var nested=NestedPagesClause("imar");Assert.IsTrue(nested.TryGetProperty("inner_hits",out _));Assert.IsFalse(nested.GetProperty("query").TryGetProperty("inner_hits",out _));}

    [TestMethod] public void PagesClause_QueryHoldsOnlyMatchClause(){var nested=NestedPagesClause("imar");var properties=0;foreach(var _ in nested.GetProperty("query").EnumerateObject())properties++;Assert.AreEqual(1,properties);Assert.IsTrue(nested.GetProperty("query").TryGetProperty("match_bool_prefix",out _));}

    // inner_hits highlight'ı üst seviye ayarı devralmaz; etiketler orada da
    // verilmezse sayfa parçaları <em> ile döner ve arayüzde düz metin görünür.
    [TestMethod] public void PagesClause_UsesMarkTagsInInnerHitsHighlight(){var nested=NestedPagesClause("imar");var tags=nested.GetProperty("inner_hits").GetProperty("highlight");Assert.AreEqual("<mark>",tags.GetProperty("pre_tags")[0].GetString());Assert.AreEqual("</mark>",tags.GetProperty("post_tags")[0].GetString());}

    [TestMethod] public void SearchBody_RendersBoolInsteadOfPlaceholder(){var body=OpenSearchHttpClient.BuildSearchBody(new SearchRequest("imar",1,25,null,null,null,null,new AccessScope("test", true, [], [], [], [])));Assert.IsFalse(body.Contains("\"bool_\""));Assert.IsTrue(body.Contains("\"bool\""));}
}

/// <summary>
/// Arama indeksi belgenin tam metnini tutar; süzgeç unutulursa liste gizlense
/// bile içerik sızar. Bu testler sorgu gövdesinde kapsam süzgecinin
/// bulunduğunu doğrular.
/// </summary>
[TestClass]
public sealed class SearchScopeFilterTests
{
    [TestMethod]
    public void Scoped_search_emits_a_unit_prefix_filter()
    {
        var body = Build(
            new AccessScope("ahmet", false, ["/MBB/GS/BID/"], [], [], []));

        Assert.IsTrue(body.Contains("\"ownerUnitPath\":\"/MBB/GS/BID/\""), body);
        Assert.IsTrue(body.Contains("\"prefix\""), body);
    }

    [TestMethod]
    public void Unrestricted_search_emits_no_scope_filter()
    {
        var body = Build(new AccessScope("teftis", true, [], [], [], []));

        Assert.IsFalse(body.Contains("ownerUnitPath"), body);
        Assert.IsFalse(body.Contains("match_none"), body);
    }

    /// <summary>
    /// Hiçbir kapsamı olmayan özneye tek belge bile dönmemeli. Süzgecin
    /// atlanması buradaki en tehlikeli hatadır.
    /// </summary>
    [TestMethod]
    public void A_subject_without_scope_gets_match_none()
    {
        var body = Build(AccessScope.Empty("yeni-personel"));

        Assert.IsTrue(body.Contains("match_none"), body);
    }

    [TestMethod]
    public void Granted_documents_are_added_to_the_scope_filter()
    {
        var documentId = Guid.CreateVersion7();

        var body = Build(
            new AccessScope("zeynep", false, ["/MBB/GS/IKE/"], [], [documentId], []));

        Assert.IsTrue(body.Contains(documentId.ToString("D")), body);
        Assert.IsTrue(body.Contains("\"terms\""), body);
    }

    private static string Build(AccessScope scope)
        => OpenSearchHttpClient.BuildSearchBody(
            new SearchRequest("hal yolu", 1, 25, null, null, null, null, scope));
}
