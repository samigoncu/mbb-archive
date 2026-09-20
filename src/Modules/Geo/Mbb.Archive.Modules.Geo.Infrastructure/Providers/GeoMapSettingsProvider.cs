using Mbb.Archive.Modules.Geo.Application.Abstractions;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

/// <summary>
/// Harita ayarı yönetim ekranından geldiği için çalışma anındaki anlık
/// görüntüden okunur; uygulamanın yeniden başlatılması gerekmez.
/// </summary>
internal sealed class GeoMapSettingsProvider(IGeoRuntimeConfiguration configuration) : IGeoMapSettings
{
    public GeoMapSettings Current
    {
        get
        {
            var runtime = configuration.Current;
            return new(
                runtime.Basemap.TileUrl,
                runtime.Basemap.Attribution,
                runtime.Basemap.CenterLatitude,
                runtime.Basemap.CenterLongitude,
                runtime.Basemap.Zoom,
                !string.IsNullOrWhiteSpace(runtime.Basemap.TileUrl),
                runtime.Wfs is not null);
        }
    }
}
