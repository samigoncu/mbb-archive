using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Branding;

/// <summary>
/// Kurum kimliği: uygulama başlığı, kurum adı ve marka görselleri.
/// </summary>
/// <remarks>
/// Tekil kayıttır (Id = 1); yükleme politikasıyla aynı desen. Görsellerin
/// kendisi <see cref="BrandingAsset"/> içinde tutulur, buradaki alanlar yalnız
/// dış adres kullanılmak istendiğinde doldurulur.
/// </remarks>
public sealed class BrandingSettings
{
    public const int MaxTextLength = 200;
    public const int MaxDescriptionLength = 500;
    public const int MaxUrlLength = 1000;

    public int Id { get; private set; } = 1;
    public string SiteTitle { get; private set; } = "MBB Kurumsal Arşiv";
    public string InstitutionName { get; private set; } = "T.C. MALATYA BÜYÜKŞEHİR BELEDİYESİ";
    public string Description { get; private set; } = "Kurumsal Belge, Arşiv ve Dijital Hafıza Platformu";
    public string? DepartmentName { get; private set; } = "Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü";
    public string? LogoUrl { get; private set; }
    public string? FaviconUrl { get; private set; }
    public string? LoginImageUrl { get; private set; }
    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset? UpdatedAt { get; private set; }

    public void Change(
        string siteTitle,
        string institutionName,
        string description,
        string? departmentName,
        string? logoUrl,
        string? faviconUrl,
        string? loginImageUrl,
        string actor,
        DateTimeOffset now)
    {
        SiteTitle = Required(siteTitle, MaxTextLength, "Uygulama başlığı");
        InstitutionName = Required(institutionName, MaxTextLength, "Kurum adı");
        Description = Required(description, MaxDescriptionLength, "Açıklama");
        DepartmentName = string.IsNullOrWhiteSpace(departmentName) ? null : departmentName.Trim();
        LogoUrl = Optional(logoUrl, "Logo adresi");
        FaviconUrl = Optional(faviconUrl, "Favicon adresi");
        LoginImageUrl = Optional(loginImageUrl, "Giriş ekranı görseli adresi");
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }

    private static string Required(string value, int maxLength, string field)
    {
        var trimmed = value?.Trim() ?? "";
        if (trimmed.Length == 0)
            throw new DomainRuleViolationException($"{field} zorunludur.");
        if (trimmed.Length > maxLength)
            throw new DomainRuleViolationException($"{field} en fazla {maxLength} karakter olabilir.");
        return trimmed;
    }

    /// <summary>Boş bırakılan adres "varsayılana dön" demektir, hata değil.</summary>
    private static string? Optional(string? value, string field)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > MaxUrlLength)
            throw new DomainRuleViolationException($"{field} en fazla {MaxUrlLength} karakter olabilir.");
        // Şema kısıtı bilinçli: javascript: gibi adreslerin arayüze sızmasını engeller.
        if (!trimmed.StartsWith('/')
            && !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            && !trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            throw new DomainRuleViolationException($"{field} http(s) adresi ya da / ile başlayan bir yol olmalıdır.");
        return trimmed;
    }
}
