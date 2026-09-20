namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

internal sealed class ClassificationConsumerOptions
{
    public const string SectionName = "Documents:Consumers:Classification";

    public string Queue { get; init; } = "mbb.archive.documents.classification.v1";
    public ushort PrefetchCount { get; init; } = 16;
}
