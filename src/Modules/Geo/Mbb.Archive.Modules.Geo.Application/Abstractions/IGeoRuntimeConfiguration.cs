namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

public sealed record GeoRuntimeLayer(
    Guid Id, string LayerName, string Title, string EntityType, string NameAttribute,
    bool VisibleByDefault, int OpacityPercent, string? ImageFormat, bool IsQueryable);

public sealed record GeoRuntimeService(
    Guid Id, string Kind, string Title, string BaseUrl, string? UserName, string? Password,
    int TimeoutSeconds, IReadOnlyList<GeoRuntimeLayer> Layers,
    /// <summary>Parola kayıtlı ama çözülemiyor: servis kimliksiz denenmemeli.</summary>
    bool SecretUnreadable = false)
{
    /// <summary>Kimlikli çağrılabilir mi; parola çözülemiyorsa hayır.</summary>
    public bool IsUsable => !SecretUnreadable;
}

public sealed record GeoRuntimeBasemap(
    string TileUrl, string Attribution, double CenterLatitude, double CenterLongitude, int Zoom);

public sealed record GeoRuntime(GeoRuntimeBasemap Basemap, IReadOnlyList<GeoRuntimeService> Services)
{
    public static readonly GeoRuntime Empty = new(new("", "", 38.3552, 38.3095, 12), []);

    public GeoRuntimeService? Wfs => Services.FirstOrDefault(x => x.Kind == "Wfs");
    public IEnumerable<GeoRuntimeService> Wms => Services.Where(x => x.Kind == "Wms");
}

/// <summary>
/// CBS yapılandırmasının çalışma anındaki görüntüsü.
/// </summary>
/// <remarks>
/// Sağlayıcı arayüzleri eşzamanlı (`IsConfigured`, `Layers`) olduğu için ayar
/// her istekte veritabanından okunamaz. Anlık görüntü açılışta yüklenir,
/// yönetim ekranındaki her değişiklikten sonra tazelenir ve çok örnekli
/// kurulumda geri kalmasın diye düzenli aralıkla yenilenir. Parola burada
/// çözülmüş hâlde taşınır; nesne süreç dışına çıkmaz.
/// </remarks>
public interface IGeoRuntimeConfiguration
{
    GeoRuntime Current { get; }

    Task RefreshAsync(CancellationToken ct);
}
