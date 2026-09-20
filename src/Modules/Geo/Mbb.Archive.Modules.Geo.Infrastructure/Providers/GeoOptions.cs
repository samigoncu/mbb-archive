namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

/// <summary>
/// CBS yapılandırması. §9/§28 gereği adres ve kimlik bilgileri yalnızca
/// environment/secret üzerinden gelir; varsayılanlar boştur ve boşken
/// sağlayıcı devre dışı kalır.
/// </summary>
internal sealed class GeoOptions
{
    public const string SectionName = "Geo";

    public WfsOptions Wfs { get; init; } = new();

    /// <summary>Harita altlığı; kurum kendi WMTS/XYZ servisini verebilir.</summary>
    public BasemapOptions Basemap { get; init; } = new();

    internal sealed class WfsOptions
    {
        /// <summary>Örn. https://cbs.example.gov.tr/geoserver/wfs — boşsa sağlayıcı kapalıdır.</summary>
        public string BaseUrl { get; init; } = string.Empty;

        public string? UserName { get; init; }
        public string? Password { get; init; }
        public int TimeoutSeconds { get; init; } = 20;

        /// <summary>Yayınlanan katmanlar; her biri bir varlık türüne eşlenir.</summary>
        public LayerOptions[] Layers { get; init; } = [];
    }

    internal sealed class LayerOptions
    {
        public string Name { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;

        /// <summary>GeoEntityType adı; örn. Road, Neighborhood, Parcel.</summary>
        public string EntityType { get; init; } = "CustomGeometry";

        /// <summary>Ada göre aramada kullanılacak öznitelik.</summary>
        public string NameAttribute { get; init; } = "name";
    }

    internal sealed class BasemapOptions
    {
        public string TileUrl { get; init; } = string.Empty;
        public string Attribution { get; init; } = string.Empty;
        public double CenterLatitude { get; init; } = 38.3552;
        public double CenterLongitude { get; init; } = 38.3095;
        public int Zoom { get; init; } = 12;
    }
}
