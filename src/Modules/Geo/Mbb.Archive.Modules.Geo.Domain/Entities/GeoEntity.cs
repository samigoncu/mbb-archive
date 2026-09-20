using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Geo.Domain.Entities;

public readonly record struct GeoEntityId(Guid Value)
{
    public static GeoEntityId New() => new(Guid.CreateVersion7());
}

/// <summary>§9'daki coğrafi nesne türleri.</summary>
public enum GeoEntityType
{
    Province = 0,
    District = 1,
    Neighborhood = 2,
    Road = 3,
    Street = 4,
    Junction = 5,
    Parcel = 6,
    Building = 7,
    Facility = 8,
    Park = 9,
    BusStop = 10,
    Route = 11,
    ProjectArea = 12,
    CustomGeometry = 13
}

/// <summary>
/// Haritadaki kurumsal nesne. §9 gereği yalnız enlem/boylam değil, sağlayıcı
/// katmanındaki gerçek feature kimliği saklanır; böylece belge, haritadaki
/// nesnenin kendisiyle ilişkilenir.
/// </summary>
public sealed class GeoEntity : AggregateRoot<GeoEntityId>
{
    /// <summary>Elle çizilen geometriler bu sağlayıcı adıyla saklanır.</summary>
    public const string LocalProvider = "local";

    private GeoEntity()
    {
    }

    private GeoEntity(
        GeoEntityId id,
        string provider,
        string layerName,
        string featureId,
        GeoEntityType entityType,
        string name,
        string geoJson,
        string? propertiesJson,
        string? externalReference,
        GeoBoundingBox boundingBox,
        DateTimeOffset createdAt)
        : base(id)
    {
        Provider = Require(provider, "Provider", 100);
        LayerName = Require(layerName, "Layer name", 200);
        FeatureId = Require(featureId, "Feature id", 200);
        Name = Require(name, "Name", 300);
        EntityType = entityType;
        GeoJson = RequireGeoJson(geoJson);
        PropertiesJson = string.IsNullOrWhiteSpace(propertiesJson) ? null : propertiesJson;
        ExternalReference = string.IsNullOrWhiteSpace(externalReference)
            ? null
            : externalReference.Trim();
        BoundingBox = boundingBox;
        CreatedAt = createdAt;
        ConcurrencyVersion = 1;
    }

    public bool IsActive { get; private set; } = true;

    public void RegisterRelationChange()
    {
        if (!IsActive) throw new DomainRuleViolationException("Inactive geography cannot receive new relations.");
        ConcurrencyVersion++;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        ConcurrencyVersion++;
    }

    public string Provider { get; private set; } = string.Empty;
    public string LayerName { get; private set; } = string.Empty;

    /// <summary>Sağlayıcı katmanındaki kalıcı feature kimliği.</summary>
    public string FeatureId { get; private set; } = string.Empty;

    public GeoEntityType EntityType { get; private set; }
    public string Name { get; private set; } = string.Empty;

    /// <summary>RFC 7946 geometri nesnesi.</summary>
    public string GeoJson { get; private set; } = string.Empty;

    public string? PropertiesJson { get; private set; }
    public string? ExternalReference { get; private set; }

    /// <summary>
    /// Harita görünümü sorguları için önceden hesaplanmış sınırlayıcı kutu.
    /// Kesin uzamsal yüklemler (contains/intersects) PostGIS gerektirir;
    /// kutu, "bu görünümde ne var" sorusu için yeterlidir.
    /// </summary>
    public GeoBoundingBox BoundingBox { get; private set; } = GeoBoundingBox.Empty;

    public DateTimeOffset CreatedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public static GeoEntity Import(
        string provider,
        string layerName,
        string featureId,
        GeoEntityType entityType,
        string name,
        string geoJson,
        string? propertiesJson,
        string? externalReference,
        GeoBoundingBox boundingBox,
        DateTimeOffset now)
        => new(
            GeoEntityId.New(),
            provider,
            layerName,
            featureId,
            entityType,
            name,
            geoJson,
            propertiesJson,
            externalReference,
            boundingBox,
            now);

    /// <summary>
    /// Sağlayıcıdan gelen güncel hâli uygular. Kimlik (provider/layer/feature)
    /// değişmez; nesne yeniden içe aktarıldığında kopya oluşmaz.
    /// </summary>
    public void Refresh(
        string name,
        string geoJson,
        string? propertiesJson,
        GeoBoundingBox boundingBox)
    {
        Name = Require(name, "Name", 300);
        GeoJson = RequireGeoJson(geoJson);
        PropertiesJson = string.IsNullOrWhiteSpace(propertiesJson) ? null : propertiesJson;
        BoundingBox = boundingBox;
        ConcurrencyVersion++;
    }

    private static string Require(string value, string field, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainRuleViolationException($"{field} is required.");

        var trimmed = value.Trim();

        if (trimmed.Length > maxLength)
            throw new DomainRuleViolationException($"{field} cannot exceed {maxLength} characters.");

        return trimmed;
    }

    private static string RequireGeoJson(string geoJson)
    {
        if (string.IsNullOrWhiteSpace(geoJson))
            throw new DomainRuleViolationException("Geometry is required.");

        return geoJson.Trim();
    }
}

/// <summary>WGS 84 sınırlayıcı kutu.</summary>
public readonly record struct GeoBoundingBox(
    double MinLongitude,
    double MinLatitude,
    double MaxLongitude,
    double MaxLatitude)
{
    public static readonly GeoBoundingBox Empty = new(0, 0, 0, 0);

    public static GeoBoundingBox FromCoordinates(IEnumerable<(double Longitude, double Latitude)> points)
    {
        double minLon = double.MaxValue, minLat = double.MaxValue;
        double maxLon = double.MinValue, maxLat = double.MinValue;
        var any = false;

        foreach (var (longitude, latitude) in points)
        {
            any = true;
            minLon = Math.Min(minLon, longitude);
            minLat = Math.Min(minLat, latitude);
            maxLon = Math.Max(maxLon, longitude);
            maxLat = Math.Max(maxLat, latitude);
        }

        return any
            ? new GeoBoundingBox(minLon, minLat, maxLon, maxLat)
            : throw new DomainRuleViolationException("Geometry contains no coordinates.");
    }

    public bool Intersects(GeoBoundingBox other)
        => MinLongitude <= other.MaxLongitude
            && MaxLongitude >= other.MinLongitude
            && MinLatitude <= other.MaxLatitude
            && MaxLatitude >= other.MinLatitude;
}
