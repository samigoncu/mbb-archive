using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.Application.Documents.Metadata;

internal static class MetadataValueValidator
{
    internal static Error? Validate(
        MetadataSchema schema,
        IReadOnlyDictionary<string, JsonElement> values)
    {
        if (schema.Status != MetadataSchemaStatus.Published)
            return Error.Conflict("classification.schema_not_published", "Only a published metadata schema can be used.");

        foreach (var key in values.Keys)
        {
            if (schema.Fields.All(x => !string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase)))
                return Error.Validation("classification.metadata_unknown_field", $"Unknown metadata field '{key}'.");
        }

        foreach (var field in schema.Fields)
        {
            var pair = values.FirstOrDefault(x => string.Equals(x.Key, field.Key, StringComparison.OrdinalIgnoreCase));
            if (string.IsNullOrEmpty(pair.Key))
            {
                if (field.IsRequired)
                    return Error.Validation("classification.metadata_required", $"Metadata field '{field.Key}' is required.");
                continue;
            }

            if (!Matches(field.FieldType, pair.Value))
                return Error.Validation("classification.metadata_type", $"Metadata field '{field.Key}' has an invalid value type.");
        }

        return null;
    }

    private static bool Matches(MetadataFieldType type, JsonElement value)
        => type switch
        {
            MetadataFieldType.Text or MetadataFieldType.TextArea or MetadataFieldType.Choice => value.ValueKind == JsonValueKind.String,
            MetadataFieldType.Integer => value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out _),
            MetadataFieldType.Decimal => value.ValueKind == JsonValueKind.Number,
            MetadataFieldType.Boolean => value.ValueKind is JsonValueKind.True or JsonValueKind.False,
            MetadataFieldType.Date => value.ValueKind == JsonValueKind.String && DateOnly.TryParse(value.GetString(), out _),
            MetadataFieldType.DateTime => value.ValueKind == JsonValueKind.String && DateTimeOffset.TryParse(value.GetString(), out _),
            MetadataFieldType.MultiChoice => value.ValueKind == JsonValueKind.Array && value.EnumerateArray().All(x => x.ValueKind == JsonValueKind.String),
            MetadataFieldType.Json => true,
            _ => false
        };
}
