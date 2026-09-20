using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Branding;

/// <summary>Yüklenen marka görseli. Logo, favicon ve giriş ekranı görseli için birer kayıt.</summary>
/// <remarks>
/// İçerik veritabanında tutulur: görseller birkaç yüz KB'ı geçmez ve belge
/// deposuna bağlamak marka ayarını belge yaşam döngüsüne (imha, saklama,
/// erişim denetimi) gereksizce ortak ederdi.
/// </remarks>
public sealed class BrandingAsset
{
    public const long MaxBytes = 1024 * 1024;

    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/x-icon", "image/vnd.microsoft.icon",
    };

    private BrandingAsset() { }

    private BrandingAsset(string kind, byte[] content, string contentType, string fileName, string actor, DateTimeOffset now)
    {
        Kind = kind;
        Replace(content, contentType, fileName, actor, now);
    }

    public string Kind { get; private set; } = string.Empty;
    public byte[] Content { get; private set; } = [];
    public string ContentType { get; private set; } = string.Empty;
    public string FileName { get; private set; } = string.Empty;
    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset UpdatedAt { get; private set; }

    public static BrandingAsset Create(string kind, byte[] content, string contentType, string fileName, string actor, DateTimeOffset now)
        => new(BrandingAssetKind.Normalize(kind), content, contentType, fileName, actor, now);

    public void Replace(byte[] content, string contentType, string fileName, string actor, DateTimeOffset now)
    {
        if (content is null || content.Length == 0)
            throw new DomainRuleViolationException("Görsel dosyası boş olamaz.");
        if (content.Length > MaxBytes)
            throw new DomainRuleViolationException($"Görsel en fazla {MaxBytes / 1024} KB olabilir.");

        var type = contentType?.Split(';')[0].Trim() ?? "";
        if (!Allowed.Contains(type))
            throw new DomainRuleViolationException("Yalnız PNG, JPEG, SVG, WEBP veya ICO yüklenebilir.");

        Content = content;
        ContentType = type;
        FileName = string.IsNullOrWhiteSpace(fileName) ? Kind : fileName.Trim()[..Math.Min(fileName.Trim().Length, 300)];
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }
}

public static class BrandingAssetKind
{
    public const string Logo = "logo";
    public const string Favicon = "favicon";
    public const string LoginImage = "login";

    public static readonly string[] All = [Logo, Favicon, LoginImage];

    public static bool IsKnown(string? kind) =>
        kind is not null && All.Contains(kind.Trim().ToLowerInvariant());

    public static string Normalize(string kind)
    {
        var value = kind?.Trim().ToLowerInvariant() ?? "";
        if (!All.Contains(value))
            throw new DomainRuleViolationException("Geçersiz görsel türü.");
        return value;
    }
}
