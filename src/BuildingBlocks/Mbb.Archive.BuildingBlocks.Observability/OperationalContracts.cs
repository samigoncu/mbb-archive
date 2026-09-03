namespace Mbb.Archive.BuildingBlocks.Observability;

public enum OperationalHealth
{
    Healthy = 0,
    Degraded = 1,
    Unhealthy = 2,
    Unknown = 3
}

public sealed record OperationalMeasurement(
    string Name,
    double Value,
    string Unit = "items",
    string? Description = null);

public sealed record OperationalIssue(
    OperationalHealth Severity,
    string Code,
    string Message);

public sealed record OperationalComponentSnapshot(
    string Component,
    OperationalHealth Health,
    DateTimeOffset CollectedAt,
    IReadOnlyList<OperationalMeasurement> Measurements,
    IReadOnlyList<OperationalIssue> Issues);

public interface IOperationalSnapshotContributor
{
    string Component { get; }

    Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken);
}

public sealed record IntegrityVerificationResult(
    string CheckName,
    OperationalHealth Health,
    DateTimeOffset StartedAt,
    DateTimeOffset CompletedAt,
    long CheckedItems,
    long FailedItems,
    string Summary,
    string DetailsJson);

public interface IIntegrityVerificationContributor
{
    string CheckName { get; }

    Task<IntegrityVerificationResult> VerifyAsync(
        CancellationToken cancellationToken);
}
