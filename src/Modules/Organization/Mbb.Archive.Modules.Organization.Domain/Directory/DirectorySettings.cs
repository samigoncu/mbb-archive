using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Organization.Domain.Directory;

/// <summary>
/// LDAP dizin bağlantısı. Tekil kayıt (Id = 1).
/// </summary>
/// <remarks>
/// <para>
/// Önceden yalnız `appsettings`/ortam değişkeninden okunuyordu; her değişiklik
/// uygulamanın yeniden başlatılmasını gerektiriyordu. Artık yönetim ekranından
/// düzenlenir, bağlama parolası şifreli saklanır.
/// </para>
/// <para>
/// Burası kimlik doğrulama yapmaz: parola doğrulaması LDAP sunucusunda kalır,
/// uygulama yalnız kullanıcı ve birim künyelerini okumak için bağlanır.
/// </para>
/// </remarks>
public sealed class DirectorySettings
{
    public int Id { get; private set; } = 1;
    public string Host { get; private set; } = string.Empty;
    public int Port { get; private set; } = 636;
    public bool UseSsl { get; private set; } = true;
    public string BindDn { get; private set; } = string.Empty;
    public string? BindPasswordCipher { get; private set; }
    public string UserSearchBase { get; private set; } = string.Empty;
    public string UnitSearchBase { get; private set; } = string.Empty;
    public string UserFilter { get; private set; } = "(&(objectClass=user)(sAMAccountName={0}))";
    public string UnitFilter { get; private set; } = "(objectClass=organizationalUnit)";
    public string UnitAttribute { get; private set; } = "department";
    public string GroupAttribute { get; private set; } = "memberOf";
    public string DisplayNameAttribute { get; private set; } = "displayName";
    public string MailAttribute { get; private set; } = "mail";
    public int TimeoutSeconds { get; private set; } = 20;

    /// <summary>Girişte dizinde bulunan kullanıcı için yerel kayıt açılsın mı.</summary>
    public bool ProvisionOnLogin { get; private set; } = true;

    public bool IsEnabled { get; private set; }
    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset? UpdatedAt { get; private set; }

    public bool HasValidConfiguration => !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(UserSearchBase);

    public bool IsConfigured => IsEnabled && HasValidConfiguration;

    /// <param name="bindPasswordCipher">
    /// null verilirse mevcut parola korunur; boş dizi parolayı siler. Panelde
    /// parola alanı boş bırakıldığında eskisinin silinmemesi için gerekli.
    /// </param>
    public void Change(
        string host, int port, bool useSsl, string bindDn, string? bindPasswordCipher,
        string userSearchBase, string unitSearchBase, string userFilter, string unitFilter,
        string unitAttribute, string groupAttribute, string displayNameAttribute, string mailAttribute,
        int timeoutSeconds, bool provisionOnLogin, bool isEnabled,
        string actor, DateTimeOffset now)
    {
        if (isEnabled && string.IsNullOrWhiteSpace(host))
            throw new DomainRuleViolationException("Dizin etkinken sunucu adresi zorunludur.");
        if (port is < 1 or > 65535)
            throw new DomainRuleViolationException("Port 1–65535 arasında olmalıdır.");
        if (timeoutSeconds is < 1 or > 300)
            throw new DomainRuleViolationException("Zaman aşımı 1–300 saniye arasında olmalıdır.");
        if (isEnabled && string.IsNullOrWhiteSpace(userSearchBase))
            throw new DomainRuleViolationException("Kullanıcı arama tabanı zorunludur.");
        if (!string.IsNullOrWhiteSpace(userFilter) && !userFilter.Contains("{0}"))
            throw new DomainRuleViolationException("Kullanıcı süzgeci, kullanıcı kimliğinin geleceği {0} yer tutucusunu içermelidir.");

        Host = host?.Trim() ?? "";
        Port = port;
        UseSsl = useSsl;
        BindDn = bindDn?.Trim() ?? "";
        if (bindPasswordCipher is { Length: 0 }) BindPasswordCipher = null;
        else if (bindPasswordCipher is not null) BindPasswordCipher = bindPasswordCipher;
        UserSearchBase = userSearchBase?.Trim() ?? "";
        UnitSearchBase = unitSearchBase?.Trim() ?? "";
        UserFilter = Fallback(userFilter, "(&(objectClass=user)(sAMAccountName={0}))");
        UnitFilter = Fallback(unitFilter, "(objectClass=organizationalUnit)");
        UnitAttribute = Fallback(unitAttribute, "department");
        GroupAttribute = Fallback(groupAttribute, "memberOf");
        DisplayNameAttribute = Fallback(displayNameAttribute, "displayName");
        MailAttribute = Fallback(mailAttribute, "mail");
        TimeoutSeconds = timeoutSeconds;
        ProvisionOnLogin = provisionOnLogin;
        IsEnabled = isEnabled;
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }

    public void SetEnabled(bool isEnabled, string actor, DateTimeOffset now)
    {
        if (isEnabled && !HasValidConfiguration)
            throw new DomainRuleViolationException("Dizin sunucu adresi ve arama tabanı yapılandırılmadan etkinleştirilemez.");

        IsEnabled = isEnabled;
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }

    private static string Fallback(string? value, string standard)
        => string.IsNullOrWhiteSpace(value) ? standard : value.Trim();
}
