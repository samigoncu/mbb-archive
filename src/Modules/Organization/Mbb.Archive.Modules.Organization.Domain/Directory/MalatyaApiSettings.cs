using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Organization.Domain.Directory;

/// <summary>
/// Malatya Büyükşehir Belediyesi API entegrasyon ayarları.
/// Tekil kayıt (Id = 1).
/// </summary>
public sealed class MalatyaApiSettings
{
    public const string DefaultBaseUrl = "https://api.malatya.bel.tr";
    public const string DefaultSmsProvider = "MBB";

    public int Id { get; private set; } = 1;
    public string BaseUrl { get; private set; } = DefaultBaseUrl;
    public string UserName { get; private set; } = string.Empty;
    public string? PasswordCipher { get; private set; }
    public string SmsProvider { get; private set; } = DefaultSmsProvider;

    /// <summary>
    /// Malatya API'nin aktif dizin kaynağı olarak devrede olup olmadığı.
    /// Bu alan true ise klasik LDAP (DirectorySettings.IsEnabled) pasiftir.
    /// </summary>
    public bool IsDirectorySyncEnabled { get; private set; }

    public DateTimeOffset? LastTestedAt { get; private set; }
    public string? LastTestStatus { get; private set; }

    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset? UpdatedAt { get; private set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(UserName);

    public void ChangeCredentials(
        string baseUrl,
        string userName,
        string? passwordCipher,
        string smsProvider,
        string actor,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
            throw new DomainRuleViolationException("Malatya API servis adresi (BaseUrl) zorunludur.");
        if (string.IsNullOrWhiteSpace(userName))
            throw new DomainRuleViolationException("Malatya API kullanıcı adı zorunludur.");

        BaseUrl = baseUrl.Trim().TrimEnd('/');
        UserName = userName.Trim();

        if (passwordCipher is { Length: 0 }) PasswordCipher = null;
        else if (passwordCipher is not null) PasswordCipher = passwordCipher;

        SmsProvider = string.IsNullOrWhiteSpace(smsProvider) ? DefaultSmsProvider : smsProvider.Trim();
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }

    public void SetDirectorySyncEnabled(bool enabled, string actor, DateTimeOffset now)
    {
        IsDirectorySyncEnabled = enabled;
        UpdatedBy = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim();
        UpdatedAt = now;
        Version++;
    }

    public void RecordTestResult(bool succeeded, string message, DateTimeOffset now)
    {
        LastTestedAt = now;
        LastTestStatus = succeeded ? $"Başarılı ({message})" : $"Hata: {message}";
    }
}

