using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.Domain.Documents;

public sealed class DocumentMetadataSet : AggregateRoot<DocumentMetadataSetId>
{
    private DocumentMetadataSet() { }

    private DocumentMetadataSet(
        DocumentMetadataSetId id,
        Guid documentId,
        MetadataSchemaId schemaId,
        int schemaVersion,
        string valuesJson,
        DateTimeOffset updatedAt)
        : base(id)
    {
        DocumentId = documentId;
        SchemaId = schemaId;
        SchemaVersion = schemaVersion;
        ValuesJson = valuesJson;
        UpdatedAt = updatedAt;
        ConcurrencyVersion = 1;
    }

    public Guid DocumentId { get; private set; }
    public MetadataSchemaId SchemaId { get; private set; }
    public int SchemaVersion { get; private set; }
    public string ValuesJson { get; private set; } = "{}";
    public DateTimeOffset UpdatedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public static DocumentMetadataSet Create(
        Guid documentId,
        MetadataSchemaId schemaId,
        int schemaVersion,
        string valuesJson,
        DateTimeOffset now)
        => new(
            DocumentMetadataSetId.New(),
            documentId,
            schemaId,
            schemaVersion,
            valuesJson,
            now);

    public void ReplaceValues(string valuesJson, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(valuesJson))
            throw new DomainRuleViolationException("Metadata JSON is required.");
        ValuesJson = valuesJson;
        UpdatedAt = now;
        ConcurrencyVersion++;
    }
}
