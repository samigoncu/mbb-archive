namespace Mbb.Archive.Modules.Classification.Domain.Documents;
public readonly record struct DocumentMetadataSetId(Guid Value)
{
    public static DocumentMetadataSetId New() => new(Guid.CreateVersion7());
}
