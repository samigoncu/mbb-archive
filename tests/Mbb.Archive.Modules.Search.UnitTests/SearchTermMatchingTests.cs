using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class SearchTermMatchingTests
{
    [TestMethod]
    [DataRow("hal yolu")]
    [DataRow("HAL YOLU")]
    [DataRow("imar")]
    [DataRow("kütüp")]
    [DataRow("KÜTÜP")]
    [DataRow("hal")]
    public void EverySearchBranch_RequiresAllTermsWithoutTypoExpansion(string query)
    {
        var request = new SearchRequest(query, 1, 25, null, null, null, null,
            new AccessScope("test", true, [], [], [], []));
        using var body = JsonDocument.Parse(OpenSearchHttpClient.BuildSearchBody(request));
        var branches = body.RootElement.GetProperty("query").GetProperty("bool").GetProperty("should");
        Assert.AreEqual(3, branches.GetArrayLength());

        foreach (var branch in branches.EnumerateArray())
        {
            var match = branch.TryGetProperty("multi_match", out var fullText)
                ? fullText
                : branch.GetProperty("nested").GetProperty("query").EnumerateObject().Single().Value
                    .EnumerateObject().Single().Value;
            Assert.AreEqual(query, match.GetProperty("query").GetString());
            Assert.AreEqual("and", match.GetProperty("operator").GetString());
            Assert.AreEqual(0, match.GetProperty("fuzziness").GetInt32());
        }
    }
}
