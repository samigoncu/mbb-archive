using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Mbb.Archive.BuildingBlocks.Observability;

public static class ArchiveTelemetry
{
    public const string ServiceName = "Mbb.Archive.Api";
    public const string MeterName = "Mbb.Archive";
    public const string ActivitySourceName = "Mbb.Archive";

    public static readonly ActivitySource ActivitySource =
        new(ActivitySourceName);

    public static readonly Meter Meter =
        new(MeterName);

    public static readonly Counter<long> IntegrationEventsPublished =
        Meter.CreateCounter<long>(
            "mbb.archive.integration_events.published",
            unit: "{event}",
            description: "Integration events confirmed by the broker.");

    public static readonly Counter<long> OperationalVerificationRuns =
        Meter.CreateCounter<long>(
            "mbb.archive.verification_runs",
            unit: "{run}",
            description: "Operations verification runs.");

    public static readonly Histogram<double> OperationalVerificationDuration =
        Meter.CreateHistogram<double>(
            "mbb.archive.verification.duration",
            unit: "s",
            description: "Operations verification duration.");

    public static readonly Counter<long> OperationalVerificationFailures =
        Meter.CreateCounter<long>(
            "mbb.archive.verification.failures",
            unit: "{failure}",
            description: "Failed integrity or DR verifications.");
}
