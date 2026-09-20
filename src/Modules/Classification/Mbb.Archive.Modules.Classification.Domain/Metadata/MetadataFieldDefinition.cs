using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Classification.Domain.Metadata;

public sealed class MetadataFieldDefinition : Entity<Guid>
{
    private MetadataFieldDefinition() { }

    internal MetadataFieldDefinition(
        Guid id,
        MetadataSchemaId schemaId,
        string key,
        string label,
        MetadataFieldType fieldType,
        bool isRequired,
        bool isSearchable,
        bool isRepeatable,
        string? optionsJson)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new DomainRuleViolationException("Metadata field key is required.");
        if (string.IsNullOrWhiteSpace(label))
            throw new DomainRuleViolationException("Metadata field label is required.");

        SchemaId = schemaId;
        Key = key.Trim();
        Label = label.Trim();
        FieldType = fieldType;
        IsRequired = isRequired;
        IsSearchable = isSearchable;
        IsRepeatable = isRepeatable;
        OptionsJson = string.IsNullOrWhiteSpace(optionsJson) ? null : optionsJson;
    }

    public MetadataSchemaId SchemaId { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string Label { get; private set; } = string.Empty;
    public MetadataFieldType FieldType { get; private set; }
    public bool IsRequired { get; private set; }
    public bool IsSearchable { get; private set; }
    public bool IsRepeatable { get; private set; }
    public string? OptionsJson { get; private set; }

    /// <summary>
    /// Alan tanımını düzeltir.
    /// </summary>
    /// <remarks>
    /// Anahtar değiştirilemez: belgelere kaydedilmiş üstveri değerleri bu
    /// anahtarla saklanır, değiştirmek mevcut kayıtların değerlerini erişilemez
    /// yapardı. Yanlış anahtar için alan kaldırılıp yenisi eklenir.
    /// </remarks>
    public void Update(string label, MetadataFieldType fieldType, bool isRequired,
        bool isSearchable, bool isRepeatable, string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new DomainRuleViolationException("Metadata field label is required.");

        Label = label.Trim();
        FieldType = fieldType;
        IsRequired = isRequired;
        IsSearchable = isSearchable;
        IsRepeatable = isRepeatable;
        OptionsJson = string.IsNullOrWhiteSpace(optionsJson) ? null : optionsJson;
    }
}
