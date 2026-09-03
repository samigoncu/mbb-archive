using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Classification.Domain.Metadata;

public sealed class MetadataSchema : AggregateRoot<MetadataSchemaId>
{
    private readonly List<MetadataFieldDefinition> _fields = [];
    private MetadataSchema() { }

    private MetadataSchema(
        MetadataSchemaId id,
        string key,
        string name,
        int version,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new DomainRuleViolationException("Metadata schema key is required.");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Metadata schema name is required.");
        if (version <= 0)
            throw new DomainRuleViolationException("Metadata schema version must be positive.");

        Key = key.Trim();
        Name = name.Trim();
        Version = version;
        Status = MetadataSchemaStatus.Draft;
        CreatedAt = createdAt;
    }

    public string Key { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public int Version { get; private set; }
    public MetadataSchemaStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? PublishedAt { get; private set; }
    public IReadOnlyCollection<MetadataFieldDefinition> Fields => _fields.AsReadOnly();

    public static MetadataSchema Create(
        string key,
        string name,
        int version,
        DateTimeOffset now)
        => new(MetadataSchemaId.New(), key, name, version, now);

    public MetadataFieldDefinition AddField(
        string key,
        string label,
        MetadataFieldType fieldType,
        bool isRequired,
        bool isSearchable,
        bool isRepeatable,
        string? optionsJson)
    {
        EnsureDraft();

        if (_fields.Any(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase)))
            throw new DomainRuleViolationException($"Metadata field key '{key}' already exists.");

        var field = new MetadataFieldDefinition(
            Guid.CreateVersion7(),
            Id,
            key,
            label,
            fieldType,
            isRequired,
            isSearchable,
            isRepeatable,
            optionsJson);

        _fields.Add(field);
        return field;
    }

    public void Publish(DateTimeOffset now)
    {
        EnsureDraft();
        if (_fields.Count == 0)
            throw new DomainRuleViolationException("Metadata schema without fields cannot be published.");
        Status = MetadataSchemaStatus.Published;
        PublishedAt = now;
    }

    private void EnsureDraft()
    {
        if (Status != MetadataSchemaStatus.Draft)
            throw new DomainRuleViolationException("Published metadata schema is immutable. Create a new version instead.");
    }
}
