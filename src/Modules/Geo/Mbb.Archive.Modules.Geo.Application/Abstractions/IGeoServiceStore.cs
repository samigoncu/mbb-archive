using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

public interface IGeoServiceStore
{
    Task<IReadOnlyList<GeoService>> GetServicesAsync(CancellationToken ct);
    Task<GeoService?> GetServiceAsync(Guid id, CancellationToken ct);
    Task<GeoBasemap> GetBasemapAsync(CancellationToken ct);
    void Add(GeoService service);
    void Remove(GeoService service);
}

/// <summary>
/// Servis parolasını şifreler ve çözer.
/// </summary>
/// <remarks>
/// Domain yalnız şifreli metni taşır; açık parola bu portun iki ucu arasında
/// kalır, böylece log, hata mesajı ve domain testlerine düşmez.
/// </remarks>
public interface IGeoSecretProtector
{
    string Protect(string plainText);

    /// <summary>Anahtar döndüyse ya da metin bozuksa <c>IsUnreadable</c> döner.</summary>
    ProtectedSecret Unprotect(string? cipherText);
}

/// <summary>Sunucudaki yayınlanmış katmanları GetCapabilities ile okur.</summary>
public interface IGeoCapabilitiesReader
{
    Task<IReadOnlyList<DiscoveredLayer>> DiscoverAsync(GeoService service, CancellationToken ct);
}

public sealed record DiscoveredLayer(string LayerName, string Title, string? Abstract, bool IsQueryable);
