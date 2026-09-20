namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

/// <summary>
/// LDAP/Active Directory yapılandırmasının ortam değişkeni yolu.
/// </summary>
public sealed class LdapOptions
{
    public const string SectionName = "Directory:Ldap";

    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 636;
    public bool UseSsl { get; init; } = true;

    /// <summary>Okuma yetkili servis hesabı; yazma yetkisi verilmemelidir.</summary>
    public string BindDn { get; init; } = string.Empty;
    public string BindPassword { get; init; } = string.Empty;

    /// <summary>Kullanıcı aramasının başlayacağı taban, örn. <c>OU=Personel,DC=mbb,DC=gov,DC=tr</c>.</summary>
    public string UserSearchBase { get; init; } = string.Empty;

    /// <summary>Birim ağacının okunacağı taban.</summary>
    public string UnitSearchBase { get; init; } = string.Empty;

    /// <summary>Kullanıcıyı sicil/kullanıcı adıyla bulan süzgeç; <c>{0}</c> özne kimliğidir.</summary>
    public string UserFilter { get; init; } = "(&(objectClass=user)(sAMAccountName={0}))";

    public string UnitFilter { get; init; } = "(objectClass=organizationalUnit)";

    /// <summary>Kullanıcının biriminin okunacağı öznitelik.</summary>
    public string UnitAttribute { get; init; } = "department";

    public string GroupAttribute { get; init; } = "memberOf";

    public string DisplayNameAttribute { get; init; } = "displayName";

    public string MailAttribute { get; init; } = "mail";

    public int TimeoutSeconds { get; init; } = 20;

    public bool IsConfigured
        => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(UserSearchBase);
}

