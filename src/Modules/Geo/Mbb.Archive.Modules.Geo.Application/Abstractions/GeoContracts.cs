using Mbb.Archive.Modules.Geo.Domain.Entities;

namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

public sealed record GeoEntitySummary(
    Guid Id,
    string Provider,
    string LayerName,
    string FeatureId,
    string EntityType,
    string Name,
    string? ExternalReference,
    double MinLongitude,
    double MinLatitude,
    double MaxLongitude,
    double MaxLatitude,
    int RelatedDocumentCount);

public sealed record GeoEntityDetails(
    Guid Id,
    string Provider,
    string LayerName,
    string FeatureId,
    string EntityType,
    string Name,
    string GeoJson,
    string? PropertiesJson,
    string? ExternalReference,
    DateTimeOffset CreatedAt);

public sealed record GeoRelationDetails(
    Guid Id,
    Guid DocumentId,
    Guid GeoEntityId,
    string GeoEntityName,
    string GeoEntityType,
    string LayerName,
    string RelationType,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo,
    bool IsActive,
    string CreatedBy,
    DateTimeOffset CreatedAt);

/// <summary>Bir coğrafi nesneye bağlı belge künyesi (§18 harita → belge).</summary>
public sealed record GeoRelatedDocument(
    Guid DocumentId,
    Guid RelationId,
    string RelationType,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo,
    bool IsActive,
    DateTimeOffset CreatedAt);

/// <summary>Sağlayıcıdan dönen ham feature; henüz kataloğa alınmamıştır.</summary>
public sealed record GeoProviderFeature(
    string Provider,
    string LayerName,
    string FeatureId,
    string Name,
    string GeoJson,
    string? PropertiesJson,
    GeoEntityType SuggestedEntityType);

public sealed record GeoLayerDescriptor(
    string Provider,
    string LayerName,
    string Title,
    string EntityType,
    bool IsConfigured);

/// <summary>
/// Harita arayüzünün ihtiyaç duyduğu yapılandırma. Altlık adresi boşsa
/// arayüz dış servise istek atmaz.
/// </summary>
public sealed record GeoMapSettings(
    string TileUrl,
    string Attribution,
    double CenterLatitude,
    double CenterLongitude,
    int Zoom,
    bool IsBasemapConfigured,
    bool IsProviderConfigured);

public interface IGeoMapSettings
{
    GeoMapSettings Current { get; }
}
