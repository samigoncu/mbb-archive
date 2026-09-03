namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Outbox;

internal sealed class ClassificationOutboxOptions
{
    public const string SectionName = "Classification:Outbox";

    public int BatchSize { get; init; } = 50;
    public int PollIntervalMilliseconds { get; init; } = 1000;
    public int LeaseSeconds { get; init; } = 120;
    public int MaxAttempts { get; init; } = 10;
    public int MaxBackoffSeconds { get; init; } = 300;
}
