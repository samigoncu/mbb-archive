using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Geo.Domain.Services;

public enum GeoServiceKind
{
    /// <summary>Öznitelik sorgusu; varlık arama ve içe aktarma buradan yapılır.</summary>
    Wfs = 0,

    /// <summary>Harita görüntüsü; bindirme katman olarak çizilir.</summary>
    Wms = 1,
}

/// <summary>
/// Kurumun CBS servisi. Adres, kimlik ve katmanları panelden yönetilir.
/// </summary>
/// <remarks>
/// Parola şifreli saklanır; domain yalnız şifreli metni taşır, çözme işini
/// altyapı yapar. Böylece sır, domain testlerine ve loglara düşmez.
/// </remarks>
public sealed class GeoService : AggregateRoot<Guid>
{
    private readonly List<GeoServiceLayer> _layers = [];

    private GeoService() { }

    private GeoService(Guid id, GeoServiceKind kind, string title, string baseUrl,
        string? userName, string? passwordCipher, int timeoutSeconds, DateTimeOffset now) : base(id)
    {
        Kind = kind;
        Apply(title, baseUrl, userName, passwordCipher, timeoutSeconds);
        IsActive = true;
        CreatedAt = now;
    }

    public GeoServiceKind Kind { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string BaseUrl { get; private set; } = string.Empty;
    public string? UserName { get; private set; }
    public string? PasswordCipher { get; private set; }
    public int TimeoutSeconds { get; private set; } = 20;
    public bool IsActive { get; private set; }
    public int SortOrder { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public string UpdatedBy { get; private set; } = "system";

    public IReadOnlyCollection<GeoServiceLayer> Layers => _layers.AsReadOnly();

    public static GeoService Create(GeoServiceKind kind, string title, string baseUrl,
        string? userName, string? passwordCipher, int timeoutSeconds, string actor, DateTimeOffset now)
    {
        var service = new GeoService(Guid.CreateVersion7(), kind, title, baseUrl, userName, passwordCipher, timeoutSeconds, now);
        service.UpdatedBy = Actor(actor);
        service.UpdatedAt = now;
        return service;
    }

    /// <param name="passwordCipher">
    /// null verilirse mevcut parola korunur; boş dizi parolayı siler. Panelde
    /// parola alanı boş bırakıldığında eskisinin silinmemesi için gerekli.
    /// </param>
    public void Update(string title, string baseUrl, string? userName, string? passwordCipher,
        int timeoutSeconds, string actor, DateTimeOffset now)
    {
        Apply(title, baseUrl, userName, passwordCipher ?? PasswordCipher, timeoutSeconds);
        if (passwordCipher is { Length: 0 }) PasswordCipher = null;
        UpdatedBy = Actor(actor);
        UpdatedAt = now;
    }

    public void SetActive(bool isActive, string actor, DateTimeOffset now)
    {
        IsActive = isActive;
        UpdatedBy = Actor(actor);
        UpdatedAt = now;
    }

    public void Reorder(int sortOrder) => SortOrder = sortOrder;

    public GeoServiceLayer AddLayer(string layerName, string title, string entityType,
        string nameAttribute, bool visibleByDefault, int opacityPercent, string? imageFormat, bool isQueryable)
    {
        if (_layers.Any(x => x.LayerName.Equals(layerName?.Trim(), StringComparison.OrdinalIgnoreCase)))
            throw new DomainRuleViolationException("Bu katman zaten eklenmiş.");

        var layer = GeoServiceLayer.Create(Id, layerName!, title, entityType, nameAttribute,
            visibleByDefault, opacityPercent, imageFormat, isQueryable, _layers.Count);
        _layers.Add(layer);
        return layer;
    }

    public void RemoveLayer(Guid layerId)
    {
        var layer = _layers.SingleOrDefault(x => x.Id == layerId)
            ?? throw new DomainRuleViolationException("Katman bulunamadı.");
        _layers.Remove(layer);
    }

    public GeoServiceLayer Layer(Guid layerId)
        => _layers.SingleOrDefault(x => x.Id == layerId)
           ?? throw new DomainRuleViolationException("Katman bulunamadı.");

    private void Apply(string title, string baseUrl, string? userName, string? passwordCipher, int timeoutSeconds)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainRuleViolationException("Servis adı zorunludur.");
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new DomainRuleViolationException("Servis adresi zorunludur.");
        if (!Uri.TryCreate(baseUrl.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new DomainRuleViolationException("Servis adresi http veya https ile başlamalıdır.");
        if (timeoutSeconds is < 1 or > 300)
            throw new DomainRuleViolationException("Zaman aşımı 1–300 saniye arasında olmalıdır.");

        Title = title.Trim();
        BaseUrl = uri.ToString();
        UserName = string.IsNullOrWhiteSpace(userName) ? null : userName.Trim();
        PasswordCipher = string.IsNullOrEmpty(passwordCipher) ? PasswordCipher : passwordCipher;
        TimeoutSeconds = timeoutSeconds;
    }

    private static string Actor(string actor) => string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
}
