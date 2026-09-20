using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Geo.Domain.Services;

/// <summary>
/// Servisten yayınlanan tek katman.
/// </summary>
/// <remarks>
/// WFS ve WMS aynı tabloda tutulur; her türün kullandığı alanlar farklıdır.
/// WFS <see cref="EntityType"/> ve <see cref="NameAttribute"/> ile arama ve
/// içe aktarma yapar; WMS <see cref="ImageFormat"/>, <see cref="OpacityPercent"/>
/// ve <see cref="VisibleByDefault"/> ile haritada çizilir.
/// </remarks>
public sealed class GeoServiceLayer : Entity<Guid>
{
    private GeoServiceLayer() { }

    private GeoServiceLayer(Guid id, Guid serviceId) : base(id) => ServiceId = serviceId;

    public Guid ServiceId { get; private set; }
    public string LayerName { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;

    /// <summary>WFS: GeoEntityType adı (Road, Neighborhood, Parcel…).</summary>
    public string EntityType { get; private set; } = "CustomGeometry";

    /// <summary>WFS: ada göre aramada kullanılacak öznitelik.</summary>
    public string NameAttribute { get; private set; } = "name";

    /// <summary>WMS: haritada açılışta görünsün mü.</summary>
    public bool VisibleByDefault { get; private set; }

    /// <summary>WMS: 10–100 arası saydamlık yüzdesi.</summary>
    public int OpacityPercent { get; private set; } = 100;

    /// <summary>WMS: image/png gibi çıktı biçimi.</summary>
    public string? ImageFormat { get; private set; }

    /// <summary>WMS: haritada tıklanınca GetFeatureInfo sorgulansın mı.</summary>
    public bool IsQueryable { get; private set; }

    public int SortOrder { get; private set; }
    public bool IsActive { get; private set; } = true;

    internal static GeoServiceLayer Create(Guid serviceId, string layerName, string title,
        string entityType, string nameAttribute, bool visibleByDefault, int opacityPercent,
        string? imageFormat, bool isQueryable, int sortOrder)
    {
        var layer = new GeoServiceLayer(Guid.CreateVersion7(), serviceId) { SortOrder = sortOrder };
        layer.Update(layerName, title, entityType, nameAttribute, visibleByDefault, opacityPercent, imageFormat, isQueryable);
        return layer;
    }

    public void Update(string layerName, string title, string entityType, string nameAttribute,
        bool visibleByDefault, int opacityPercent, string? imageFormat, bool isQueryable)
    {
        if (string.IsNullOrWhiteSpace(layerName))
            throw new DomainRuleViolationException("Katman adı zorunludur.");
        if (opacityPercent is < 10 or > 100)
            throw new DomainRuleViolationException("Saydamlık 10–100 arasında olmalıdır.");

        LayerName = layerName.Trim();
        Title = string.IsNullOrWhiteSpace(title) ? LayerName : title.Trim();
        EntityType = string.IsNullOrWhiteSpace(entityType) ? "CustomGeometry" : entityType.Trim();
        NameAttribute = string.IsNullOrWhiteSpace(nameAttribute) ? "name" : nameAttribute.Trim();
        VisibleByDefault = visibleByDefault;
        OpacityPercent = opacityPercent;
        ImageFormat = string.IsNullOrWhiteSpace(imageFormat) ? null : imageFormat.Trim();
        IsQueryable = isQueryable;
    }

    public void SetActive(bool isActive) => IsActive = isActive;

    public void Reorder(int sortOrder) => SortOrder = sortOrder;
}
