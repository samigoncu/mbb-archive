using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Search.Domain.Documents;

public sealed class SearchDocument : AggregateRoot<Guid>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private SearchDocument() { }

    private SearchDocument(Guid documentId, string title, DateTimeOffset now)
        : base(documentId)
    {
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");

        Title = NormalizeRequired(title, "Document title");
        ClassificationJson = "[]";
        MetadataJson = "[]";
        GeoJson = "[]";
        Revision = 1;
        UpdatedAt = now;
    }

    public string Title { get; private set; } = string.Empty;
    public Guid? DocumentVersionId { get; private set; }
    public string? MimeType { get; private set; }
    public string? TextArtifactStorageKey { get; private set; }
    public string? OcrJsonArtifactStorageKey { get; private set; }
    public string ClassificationJson { get; private set; } = "[]";
    public string MetadataJson { get; private set; } = "[]";

    /// <summary>Belgenin aktif coğrafi ilişkileri; §10'daki CBS aranabilirliği.</summary>
    public string GeoJson { get; private set; } = "[]";

    /// <summary>
    /// Sahibi birimin materyalize yolu. Arama sorgusu bu alan üzerinden
    /// süzülür; indekste süzgeç olmazsa liste gizlense bile belge içeriği
    /// arama sonucunda sızar.
    /// </summary>
    public string? OwnerUnitPath { get; private set; }
    public long Revision { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static SearchDocument Create(
        Guid documentId,
        string title,
        DateTimeOffset now)
        => new(documentId, title, now);

    public void EnsureTitle(string title, DateTimeOffset now)
    {
        var normalized = NormalizeRequired(title, "Document title");

        if (string.Equals(Title, normalized, StringComparison.Ordinal))
            return;

        Title = normalized;
        Touch(now);
    }

    public void ApplyProcessing(
        Guid documentVersionId,
        string? mimeType,
        string? textArtifactStorageKey,
        string? ocrJsonArtifactStorageKey,
        DateTimeOffset now)
    {
        DocumentVersionId = documentVersionId;
        MimeType = string.IsNullOrWhiteSpace(mimeType) ? MimeType : mimeType.Trim();
        TextArtifactStorageKey = NormalizeOptional(textArtifactStorageKey);
        OcrJsonArtifactStorageKey = NormalizeOptional(ocrJsonArtifactStorageKey);
        Touch(now);
    }

    public void UpsertClassification(
        string filePlanCode,
        string filePlanName,
        string itemCode,
        string itemTitle,
        bool isPrimary,
        DateTimeOffset now)
    {
        var entries = DeserializeList<SearchClassificationEntry>(ClassificationJson);
        if (isPrimary) entries.RemoveAll(x => x.IsPrimary);
        entries.RemoveAll(x =>
            string.Equals(x.FilePlanCode, filePlanCode, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(x.ItemCode, itemCode, StringComparison.OrdinalIgnoreCase));

        entries.Add(
            new SearchClassificationEntry(
                filePlanCode,
                filePlanName,
                itemCode,
                itemTitle,
                isPrimary));

        ClassificationJson = JsonSerializer.Serialize(entries, JsonOptions);
        Touch(now);
    }

    public void ReplaceMetadataSchema(
        string schemaKey,
        string schemaName,
        int schemaVersion,
        string valuesJson,
        DateTimeOffset now)
    {
        using var values = JsonDocument.Parse(valuesJson);
        var entries = DeserializeList<SearchMetadataSchemaEntry>(MetadataJson);

        entries.RemoveAll(x =>
            string.Equals(x.SchemaKey, schemaKey, StringComparison.OrdinalIgnoreCase));

        entries.Add(
            new SearchMetadataSchemaEntry(
                schemaKey,
                schemaName,
                schemaVersion,
                values.RootElement.Clone()));

        MetadataJson = JsonSerializer.Serialize(entries, JsonOptions);
        Touch(now);
    }

    /// <summary>
    /// Aktif coğrafi ilişkilerin tamamını değiştirir. Geo modülü fark değil
    /// bütün küme yayınladığı için burada birleştirme yapılmaz; küme aynıysa
    /// yeniden indeksleme tetiklenmez.
    /// </summary>
    public void ReplaceGeoRelations(
        IReadOnlyList<SearchGeoRelationEntry> relations,
        DateTimeOffset now)
    {
        var serialized = JsonSerializer.Serialize(relations, JsonOptions);

        if (string.Equals(GeoJson, serialized, StringComparison.Ordinal))
            return;

        GeoJson = serialized;
        Touch(now);
    }

    public void SetOwnerUnitPath(string? ownerUnitPath, DateTimeOffset now)
    {
        var normalized = NormalizeOptional(ownerUnitPath);

        if (string.Equals(OwnerUnitPath, normalized, StringComparison.Ordinal))
            return;

        OwnerUnitPath = normalized;
        Touch(now);
    }

    private void Touch(DateTimeOffset now)
    {
        Revision++;
        UpdatedAt = now;
    }

    private static List<T> DeserializeList<T>(string json)
        => JsonSerializer.Deserialize<List<T>>(json, JsonOptions) ?? [];

    private static string NormalizeRequired(string value, string name)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainRuleViolationException($"{name} is required.");

        return value.Trim();
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed record SearchClassificationEntry(
    string FilePlanCode,
    string FilePlanName,
    string ItemCode,
    string ItemTitle,
    bool IsPrimary);

public sealed record SearchMetadataSchemaEntry(
    string SchemaKey,
    string SchemaName,
    int SchemaVersion,
    JsonElement Values);

public sealed record SearchGeoRelationEntry(
    Guid GeoEntityId,
    string Name,
    string EntityType,
    string LayerName,
    string RelationType);
