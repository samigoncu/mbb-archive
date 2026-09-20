using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

internal static class OpenSearchConditionQuery
{
    public static object Build(SearchCondition condition)
    {
        var exact = condition.Operator is "equals" or "notEquals";
        var value = condition.Value.Trim();
        if (condition.Field.StartsWith("metadata:", StringComparison.Ordinal))
        {
            // Both key and value must belong to the same nested entry. Negation
            // belongs outside this nested clause, so another entry cannot admit a match.
            return new { nested = new { path = "metadataEntries", query = new Dictionary<string, object>
            {
                ["bool"] = new { filter = new object[]
                {
                    Clause("term", "metadataEntries.key", condition.Field[9..]),
                    Clause(exact ? "term" : "match_phrase", exact ? "metadataEntries.valueKeyword" : "metadataEntries.valueText", value)
                } }
            } } };
        }
        if (condition.Field == "keyword")
            return new { multi_match = new { query = value, fields = new[] { "title", "body", "filePlanTitles" }, type = "phrase" } };
        var field = condition.Field switch
        {
            "title" => exact ? "title.raw" : "title",
            "mimeType" => "mimeType",
            "filePlanCode" => "filePlanCodes",
            _ => throw new ArgumentException("Unsupported search field.")
        };
        return Clause(exact ? "term" : "match_phrase", field, value);
    }

    private static object Clause(string kind, string field, string value)
        => new Dictionary<string, object> { [kind] = new Dictionary<string, string> { [field] = value } };
}
