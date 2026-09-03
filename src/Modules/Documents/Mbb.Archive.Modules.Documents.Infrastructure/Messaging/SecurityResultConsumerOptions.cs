namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

internal sealed class SecurityResultConsumerOptions
{
    public const string SectionName = "Documents:Consumers:SecurityResults";

    public string Queue { get; init; } = "mbb.archive.documents.security-results.v1";
    public ushort PrefetchCount { get; init; } = 16;
}
