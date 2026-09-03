namespace Mbb.Archive.BuildingBlocks.Domain;

/// <summary>
/// Aggregate invariant'ının ihlal edildiğini belirtir.
/// Beklenen application validation yerine kullanılmamalıdır.
/// </summary>
public sealed class DomainRuleViolationException : Exception
{
    public DomainRuleViolationException(string message)
        : base(message)
    {
    }
}
