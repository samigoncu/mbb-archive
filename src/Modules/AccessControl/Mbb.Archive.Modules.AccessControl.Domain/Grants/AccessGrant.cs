using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.AccessControl.Domain.Grants;

/// <summary>Paylaşımın hedeflediği kaynak türü.</summary>
public enum GrantResourceType
{
    /// <summary>Tek belge. En dar, en çok kayıt üreten yol.</summary>
    Document = 0,

    /// <summary>
    /// Dosya planı dalı. Ölçeklenen kullanım budur: "İnsan Kaynakları tüm
    /// birimlerin 903 Özlük evrakını görsün" tek kayıttır.
    /// </summary>
    FilePlanItem = 1,

    Collection = 2,
    PhysicalFolder = 3
}

/// <summary>Yetkinin verildiği özne türü.</summary>
public enum GrantSubjectType
{
    /// <summary>Tek kullanıcı (sicil).</summary>
    User = 0,

    /// <summary>Dizin grubu veya arşiv rolü kodu.</summary>
    Group = 1,

    /// <summary>Bir birim ve altındaki herkes.</summary>
    OrganizationUnit = 2
}

/// <summary>Verilen izin. Okuma ile indirme bilinçli olarak ayrıdır.</summary>
public enum GrantPermission
{
    Read = 0,
    Download = 1,
    Export = 2
}

/// <summary>
/// Birim kapsamını aşan istisna yetkisi. Süresiz yetki zamanla kimsenin
/// hatırlamadığı bir açığa dönüştüğü için süre, veren ve gerekçe kaydedilir;
/// kaldırma silme değil kapatmadır, geçmiş korunur.
/// </summary>
public sealed class AccessGrant : AggregateRoot<Guid>
{
    private AccessGrant()
    {
    }

    private AccessGrant(
        Guid id,
        GrantResourceType resourceType,
        string resourceKey,
        GrantSubjectType subjectType,
        string subjectKey,
        GrantPermission permission,
        DateTimeOffset? validFrom,
        DateTimeOffset? validTo,
        string grantedBy,
        string? reason,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (validFrom is not null && validTo is not null && validTo < validFrom)
            throw new DomainRuleViolationException("Grant validity end cannot precede its start.");

        ResourceType = resourceType;
        ResourceKey = Require(resourceKey, "Resource key", 200);
        SubjectType = subjectType;
        SubjectKey = Require(subjectKey, "Subject key", 300);
        Permission = permission;
        ValidFrom = validFrom;
        ValidTo = validTo;
        GrantedBy = Require(grantedBy, "Granting subject", 200);
        Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        CreatedAt = createdAt;
    }

    public GrantResourceType ResourceType { get; private set; }

    /// <summary>
    /// Kaynağın kimliği. Belge/koleksiyon/dosya için GUID'in "D" biçimi,
    /// dosya planı dalı için kalem kodu. Tek sütun, tek indeks.
    /// </summary>
    public string ResourceKey { get; private set; } = string.Empty;

    public GrantSubjectType SubjectType { get; private set; }

    /// <summary>Sicil, grup/rol kodu veya birim kimliği.</summary>
    public string SubjectKey { get; private set; } = string.Empty;

    public GrantPermission Permission { get; private set; }
    public DateTimeOffset? ValidFrom { get; private set; }
    public DateTimeOffset? ValidTo { get; private set; }
    public string GrantedBy { get; private set; } = string.Empty;
    public string? Reason { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static AccessGrant Create(
        GrantResourceType resourceType,
        string resourceKey,
        GrantSubjectType subjectType,
        string subjectKey,
        GrantPermission permission,
        DateTimeOffset? validFrom,
        DateTimeOffset? validTo,
        string grantedBy,
        string? reason,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            resourceType,
            NormalizeResourceKey(resourceType, resourceKey),
            subjectType,
            subjectKey,
            permission,
            validFrom,
            validTo,
            grantedBy,
            reason,
            now);

    /// <summary>Yetkiyi kapatır; kayıt kalır, kim ne zaman verip kaldırmış görünür.</summary>
    public void Revoke(DateTimeOffset at)
    {
        if (ValidTo is not null && ValidTo <= at)
            return;

        ValidTo = ValidFrom is not null && at < ValidFrom ? ValidFrom : at;
    }

    public bool IsActiveAt(DateTimeOffset moment)
        => (ValidFrom is null || ValidFrom <= moment)
            && (ValidTo is null || ValidTo > moment);

    /// <summary>
    /// Dosya planı kodları büyük/küçük harf duyarsız eşleşir; GUID'ler tek
    /// biçimde saklanır ki aynı kaynak iki farklı yazımla iki kayıt üretmesin.
    /// </summary>
    private static string NormalizeResourceKey(GrantResourceType type, string key)
    {
        var trimmed = key?.Trim() ?? string.Empty;

        if (type == GrantResourceType.FilePlanItem)
            return trimmed.ToUpperInvariant();

        return Guid.TryParse(trimmed, out var parsed)
            ? parsed.ToString("D")
            : trimmed;
    }

    private static string Require(string value, string field, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainRuleViolationException($"{field} is required.");

        var trimmed = value.Trim();

        if (trimmed.Length > maxLength)
            throw new DomainRuleViolationException($"{field} cannot exceed {maxLength} characters.");

        return trimmed;
    }
}
