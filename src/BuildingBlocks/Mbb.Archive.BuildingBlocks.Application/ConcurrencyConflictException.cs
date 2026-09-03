namespace Mbb.Archive.BuildingBlocks.Application;

/// <summary>
/// Persistence katmanındaki optimistic concurrency çakışmasını application boundary'ye
/// provider bağımsız şekilde taşır.
/// </summary>
public sealed class ConcurrencyConflictException : Exception
{
    public ConcurrencyConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
