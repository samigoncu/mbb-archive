namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

internal sealed class PromotionConsumerOptions
{
    public const string SectionName = "Documents:Consumers:Promotion";

    public string Queue { get; init; } = "mbb.archive.documents.promotion.v1";
    public ushort PrefetchCount { get; init; } = 2;
}
