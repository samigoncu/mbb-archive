namespace Mbb.Archive.Modules.Workflow.Application;

/// <summary>
/// Safe deterministic condition subset. Arbitrary code execution is intentionally forbidden.
/// Supported: key == value, key != value, exists(key).
/// </summary>
public sealed class WorkflowConditionEvaluator
{
    public bool Evaluate(
        string? expression,
        IReadOnlyDictionary<string, string> variables)
    {
        if (string.IsNullOrWhiteSpace(expression))
            return true;

        var condition = expression.Trim();

        if (condition.StartsWith("exists(", StringComparison.OrdinalIgnoreCase)
            && condition.EndsWith(')'))
        {
            var key = condition[7..^1].Trim().ToLowerInvariant();
            return variables.ContainsKey(key);
        }

        if (TrySplit(condition, "==", out var equalsKey, out var equalsValue))
        {
            return variables.TryGetValue(equalsKey, out var actual)
                && string.Equals(actual, equalsValue, StringComparison.OrdinalIgnoreCase);
        }

        if (TrySplit(condition, "!=", out var notEqualsKey, out var notEqualsValue))
        {
            return !variables.TryGetValue(notEqualsKey, out var actual)
                || !string.Equals(actual, notEqualsValue, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    private static bool TrySplit(
        string expression,
        string operation,
        out string key,
        out string value)
    {
        var index = expression.IndexOf(operation, StringComparison.Ordinal);

        if (index <= 0)
        {
            key = string.Empty;
            value = string.Empty;
            return false;
        }

        key = expression[..index].Trim().ToLowerInvariant();
        value = expression[(index + operation.Length)..].Trim().Trim('"', '\'');
        return key.Length > 0;
    }
}
