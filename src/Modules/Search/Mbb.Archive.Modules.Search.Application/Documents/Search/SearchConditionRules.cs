using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Search;

public static class SearchConditionRules
{
    public static bool IsValid(SearchCondition? condition)
    {
        if (condition is null || string.IsNullOrWhiteSpace(condition.Value) || condition.Value.Length > 500
            || string.IsNullOrWhiteSpace(condition.Field) || condition.Field.Length > 160)
            return false;
        var field = condition.Field;
        var metadata = field.StartsWith("metadata:", StringComparison.Ordinal)
            && field.Length > 9 && field[9..].All(c => char.IsLetterOrDigit(c) || c is '.' or '_' or '-');
        if (!metadata && field is not ("keyword" or "title" or "mimeType" or "filePlanCode")) return false;
        return condition.Operator switch
        {
            "contains" or "notContains" => metadata || field is "keyword" or "title",
            "equals" or "notEquals" => metadata || field is "title" or "mimeType" or "filePlanCode",
            _ => false
        };
    }
}
