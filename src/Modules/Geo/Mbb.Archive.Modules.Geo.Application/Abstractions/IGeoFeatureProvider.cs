using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

/// <summary>
/// CBS sağlayıcı portu (§9). Servis adresi ve kimlik bilgileri yalnızca
/// environment/secret üzerinden gelir; hiçbir uygulama kodunda sabitlenmez.
/// Yapılandırılmamış sağlayıcı sessizce boş dönmez, açıkça hata bildirir.
/// </summary>
public interface IGeoFeatureProvider
{
    string Name { get; }

    bool IsConfigured { get; }

    IReadOnlyList<GeoLayerDescriptor> Layers { get; }

    Task<Result<IReadOnlyList<GeoProviderFeature>>> SearchAsync(
        string layerName,
        string query,
        int limit,
        CancellationToken cancellationToken);

    Task<Result<GeoProviderFeature>> GetFeatureAsync(
        string layerName,
        string featureId,
        CancellationToken cancellationToken);
}
