namespace Mbb.Archive.Modules.Classification.Domain.Metadata;
public readonly record struct MetadataSchemaId(Guid Value)
{
    public static MetadataSchemaId New() => new(Guid.CreateVersion7());
}
