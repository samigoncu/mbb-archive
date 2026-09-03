namespace Mbb.Archive.Modules.Classification.Domain.Documents;
public readonly record struct DocumentClassificationId(Guid Value)
{
    public static DocumentClassificationId New() => new(Guid.CreateVersion7());
}
