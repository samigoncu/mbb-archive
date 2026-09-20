using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Geo.Domain.Services;

/// <summary>Harita altlığı ve açılış görünümü. Tekil kayıt (Id = 1).</summary>
public sealed class GeoBasemap
{
    public int Id { get; private set; } = 1;
    public string TileUrl { get; private set; } = string.Empty;
    public string Attribution { get; private set; } = string.Empty;
    public double CenterLatitude { get; private set; } = 38.3552;
    public double CenterLongitude { get; private set; } = 38.3095;
    public int Zoom { get; private set; } = 12;
    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset? UpdatedAt { get; private set; }

    public void Change(string tileUrl, string attribution, double latitude, double longitude,
        int zoom, string actor, DateTimeOffset now)
    {
        var url = tileUrl?.Trim() ?? "";
        // Boş adres "altlık yok" demektir; harita nötr zeminde çizilir.
        if (url.Length > 0 && !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            throw new DomainRuleViolationException("Altlık adresi http veya https ile başlamalıdır.");
        if (latitude is < -90 or > 90) throw new DomainRuleViolationException("Enlem -90 ile 90 arasında olmalıdır.");
        if (longitude is < -180 or > 180) throw new DomainRuleViolationException("Boylam -180 ile 180 arasında olmalıdır.");
        if (zoom is < 1 or > 22) throw new DomainRuleViolationException("Yakınlaştırma 1–22 arasında olmalıdır.");

        TileUrl = url;
        Attribution = attribution?.Trim() ?? "";
        CenterLatitude = latitude;
        CenterLongitude = longitude;
        Zoom = zoom;
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }
}
