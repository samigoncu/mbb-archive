namespace Mbb.Archive.Worker.SecurityScan;

internal sealed class SecurityScanOptions
{
    public const string SectionName = "SecurityScan";

    public string Queue { get; init; } = "mbb.archive.ingestion.security.v1";
    public string StagingRootPath { get; init; } = "./.local-data/staging";
    public ushort PrefetchCount { get; init; } = 1;
    public int RetryDelaySeconds { get; init; } = 5;

    public string ClamAvHost { get; init; } = "localhost";
    public int ClamAvPort { get; init; } = 3310;
    public int ClamAvTimeoutSeconds { get; init; } = 660;
}
