namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;

internal sealed class OriginalStoredConsumerOptions
{
    public const string SectionName = "Processing:Consumers:OriginalStored";

    public string Queue { get; init; } = "mbb.archive.processing.original-stored.v1";
    public ushort PrefetchCount { get; init; } = 16;
}
