using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Storage;

public sealed record StorageCapacitySnapshot(Guid Id, long OriginalBytes, long ArtifactBytes,
    long CapacityBytes, DateTimeOffset CapturedAt)
{
    public static StorageCapacitySnapshot Capture(long original, long artifacts, long capacity, DateTimeOffset at)
    {
        if (original < 0 || artifacts < 0 || capacity <= 0 || original + artifacts > capacity)
            throw new DomainRuleViolationException("Storage capacity snapshot values are invalid.");
        return new(Guid.CreateVersion7(), original, artifacts, capacity, at);
    }
    public long CurrentBytes => OriginalBytes + ArtifactBytes;
}

public sealed record StorageGrowthForecast(Guid Id, long CurrentBytes, long CapacityBytes,
    double UtilizationPercent, double DailyGrowthBytes, long Forecast30Days, long Forecast90Days,
    int? EstimatedDaysRemaining, DateTimeOffset GeneratedAt)
{
    public static StorageGrowthForecast Calculate(IReadOnlyList<StorageCapacitySnapshot> snapshots, DateTimeOffset now)
    {
        if (snapshots.Count == 0) throw new DomainRuleViolationException("At least one storage snapshot is required.");
        var ordered = snapshots.OrderBy(x => x.CapturedAt).ToArray(); var latest = ordered[^1];
        var elapsedDays = ordered.Length < 2 ? 0 : (latest.CapturedAt - ordered[0].CapturedAt).TotalDays;
        var growth = elapsedDays <= 0 ? 0 : Math.Max(0, (latest.CurrentBytes - ordered[0].CurrentBytes) / elapsedDays);
        var remaining = latest.CapacityBytes - latest.CurrentBytes;
        var days = growth <= 0 ? null : (int?)Math.Max(0, Math.Floor(remaining / growth));
        return new(Guid.CreateVersion7(), latest.CurrentBytes, latest.CapacityBytes,
            latest.CurrentBytes * 100d / latest.CapacityBytes, growth,
            checked(latest.CurrentBytes + (long)(growth * 30)), checked(latest.CurrentBytes + (long)(growth * 90)), days, now);
    }
}
