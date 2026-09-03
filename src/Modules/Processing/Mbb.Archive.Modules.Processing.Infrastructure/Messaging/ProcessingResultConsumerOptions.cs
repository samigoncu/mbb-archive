namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;
internal sealed class ProcessingResultConsumerOptions
{
    public const string SectionName="Processing:Consumers:Results";
    public string Queue { get; init; }="mbb.archive.processing.results.v1";
    public ushort PrefetchCount { get; init; }=16;
}
