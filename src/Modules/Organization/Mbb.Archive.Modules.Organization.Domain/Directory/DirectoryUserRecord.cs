using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Organization.Domain.Directory;

/// <summary>
/// Kullanıcının uygulamadaki kaydı.
/// </summary>
/// <remarks>
/// <para>
/// Bir kimlik doğrulama hesabı <em>değildir</em>: parola tutmaz, oturum
/// açtırmaz. Dizindeki kişinin uygulamadaki yansımasıdır — ad, e-posta, unvan
/// ve aktiflik. Bunlar olmadan arayüz ve denetim kayıtları kullanıcıyı ham
/// <c>sAMAccountName</c> ile göstermek zorunda kalıyordu.
/// </para>
/// <para>
/// <see cref="SubjectId"/> kimlik sağlayıcının değişmez kimliğidir ve rol ile
/// birim atamalarının bağlandığı anahtardır; ad soyad değişse de sabit kalır.
/// </para>
/// </remarks>
public sealed class DirectoryUserRecord : AggregateRoot<Guid>
{
    private DirectoryUserRecord() { }

    private DirectoryUserRecord(Guid id, string subjectId, DateTimeOffset now) : base(id)
    {
        SubjectId = Normalize(subjectId);
        CreatedAt = now;
    }

    public string SubjectId { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Title { get; private set; }
    public string? UnitReference { get; private set; }

    /// <summary>Dizinde hesabın kapalı olması uygulamada da erişimi kısıtlar.</summary>
    public bool IsActive { get; private set; } = true;

    /// <summary>"Directory" ya da "Manual"; elle açılan kayıt eşitlemede ezilmez.</summary>
    public string Source { get; private set; } = "Manual";

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? LastSyncedAt { get; private set; }
    public DateTimeOffset? LastSeenAt { get; private set; }

    public static DirectoryUserRecord Create(string subjectId, string source, DateTimeOffset now)
    {
        var record = new DirectoryUserRecord(Guid.CreateVersion7(), subjectId, now)
        {
            Source = source is "Directory" ? "Directory" : "Manual",
        };
        record.DisplayName = record.SubjectId;
        return record;
    }

    /// <summary>Dizinden okunan künyeyi yazar; kaynak "Directory" olur.</summary>
    public void ApplyDirectory(
        string displayName, string? email, string? title, string? unitReference,
        bool isActive, DateTimeOffset now)
    {
        DisplayName = string.IsNullOrWhiteSpace(displayName) ? SubjectId : displayName.Trim();
        Email = Trim(email);
        Title = Trim(title);
        UnitReference = Trim(unitReference);
        IsActive = isActive;
        Source = "Directory";
        LastSyncedAt = now;
    }

    /// <summary>Dizin bağlı değilken yöneticinin elle girdiği künye.</summary>
    public void ApplyManual(string displayName, string? email, string? title, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new DomainRuleViolationException("Görünen ad zorunludur.");

        DisplayName = displayName.Trim();
        Email = Trim(email);
        Title = Trim(title);
        IsActive = isActive;
        Source = "Manual";
    }

    public void MarkSeen(DateTimeOffset now) => LastSeenAt = now;

    private static string? Trim(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Normalize(string subjectId)
    {
        var value = subjectId?.Trim() ?? "";
        if (value.Length == 0)
            throw new DomainRuleViolationException("Kullanıcı kimliği zorunludur.");
        if (value.Length > 300)
            throw new DomainRuleViolationException("Kullanıcı kimliği en fazla 300 karakter olabilir.");
        return value;
    }
}
