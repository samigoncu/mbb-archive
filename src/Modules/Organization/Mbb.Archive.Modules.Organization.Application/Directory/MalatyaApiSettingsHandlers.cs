using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Organization.Domain.Directory;

namespace Mbb.Archive.Modules.Organization.Application.Directory;

public interface IMalatyaApiSettingsStore
{
    Task<MalatyaApiSettings> GetAsync(CancellationToken ct);
}

public sealed record MalatyaAuthTokenResult(bool Succeeded, string? Token, string? Expires, string? Error);
public sealed record MalatyaSmsResult(bool Succeeded, string? ProviderReference, string? Error);

public interface IMalatyaApiClient
{
    Task<MalatyaAuthTokenResult> LoginAsync(string baseUrl, string userName, string password, CancellationToken ct);
    Task<MalatyaAuthTokenResult> GetValidTokenAsync(CancellationToken ct);
    Task<MalatyaSmsResult> SendOtpSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct);
    Task<MalatyaSmsResult> SendSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct);
}

public sealed record MalatyaApiSettingsView(
    string BaseUrl,
    string UserName,
    bool HasPassword,
    string SmsProvider,
    bool IsDirectorySyncEnabled,
    bool IsLdapEnabled,
    DateTimeOffset? LastTestedAt,
    string? LastTestStatus,
    long Version,
    DateTimeOffset? UpdatedAt,
    string UpdatedBy);

public sealed record SaveMalatyaApiSettings(
    string BaseUrl,
    string UserName,
    string? Password,
    string SmsProvider,
    long ExpectedVersion);

public sealed record SwitchDirectorySourceRequest(
    string TargetSource); // "MalatyaApi" | "Ldap"

public sealed record TestConnectionRequest(
    string? BaseUrl,
    string? UserName,
    string? Password);

public sealed record TestSmsRequest(
    string Message,
    IReadOnlyList<string> To,
    bool IsOtp,
    string? Provider);

public sealed class MalatyaApiSettingsHandlers(
    IMalatyaApiSettingsStore malatyaStore,
    IDirectorySettingsStore ldapStore,
    IDirectorySecretProtector protector,
    IMalatyaApiClient malatyaApiClient,
    IUnitOfWork<OrganizationBoundary> uow,
    ICurrentUserPermissions user,
    TimeProvider time,
    ILdapConnectionTester? ldapTester = null)
{
    public async Task<MalatyaApiSettingsView> GetAsync(CancellationToken ct)
    {
        var malatya = await malatyaStore.GetAsync(ct);
        var ldap = await ldapStore.GetAsync(ct);
        return View(malatya, ldap.IsEnabled);
    }

    public async Task<Result<MalatyaApiSettingsView>> SaveAsync(SaveMalatyaApiSettings request, CancellationToken ct)
    {
        var malatya = await malatyaStore.GetAsync(ct);
        var ldap = await ldapStore.GetAsync(ct);

        if (request.ExpectedVersion != malatya.Version)
            return Result<MalatyaApiSettingsView>.Failure(Error.Conflict("organization.malatya_api_conflict",
                "Malatya API ayarları başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin."));

        try
        {
            malatya.ChangeCredentials(
                request.BaseUrl,
                request.UserName,
                request.Password switch { null => null, "" => "", var value => protector.Protect(value) },
                request.SmsProvider,
                user.Subject,
                time.GetUtcNow());
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<MalatyaApiSettingsView>.Failure(Error.Validation("organization.malatya_api_invalid", exception.Message));
        }

        await uow.SaveChangesAsync(ct);
        return Result<MalatyaApiSettingsView>.Success(View(malatya, ldap.IsEnabled));
    }

    public async Task<Result<MalatyaAuthTokenResult>> TestConnectionAsync(TestConnectionRequest? request, CancellationToken ct)
    {
        var malatya = await malatyaStore.GetAsync(ct);
        var baseUrl = !string.IsNullOrWhiteSpace(request?.BaseUrl) ? request.BaseUrl : malatya.BaseUrl;
        var userName = !string.IsNullOrWhiteSpace(request?.UserName) ? request.UserName : malatya.UserName;

        string? password = null;
        if (!string.IsNullOrEmpty(request?.Password))
        {
            password = request.Password;
        }
        else if (!string.IsNullOrEmpty(malatya.PasswordCipher))
        {
            var unprotected = protector.Unprotect(malatya.PasswordCipher);
            if (!unprotected.IsUnreadable) password = unprotected.Value;
        }

        if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(password))
        {
            return Result<MalatyaAuthTokenResult>.Failure(Error.Validation("organization.malatya_api_credentials_missing",
                "Bağlantıyı test etmek için servis adresi, kullanıcı adı ve parola zorunludur."));
        }

        var result = await malatyaApiClient.LoginAsync(baseUrl, userName, password, ct);
        var now = time.GetUtcNow();
        malatya.RecordTestResult(result.Succeeded, result.Succeeded ? $"Token alındı (Bitiş: {result.Expires})" : (result.Error ?? "Bilinmeyen hata"), now);
        await uow.SaveChangesAsync(ct);

        return Result<MalatyaAuthTokenResult>.Success(result);
    }

    public async Task<Result<MalatyaApiSettingsView>> SwitchDirectorySourceAsync(SwitchDirectorySourceRequest request, CancellationToken ct)
    {
        var target = request.TargetSource?.Trim();
        var malatya = await malatyaStore.GetAsync(ct);
        var ldap = await ldapStore.GetAsync(ct);
        var now = time.GetUtcNow();
        var actor = user.Subject;

        if (string.Equals(target, "MalatyaApi", StringComparison.OrdinalIgnoreCase))
        {
            // Malatya API doğrulaması yapılır: Token almayı dene
            var test = await malatyaApiClient.GetValidTokenAsync(ct);
            if (!test.Succeeded)
            {
                return Result<MalatyaApiSettingsView>.Failure(Error.Failure("organization.malatya_api_verification_failed",
                    $"Malatya API bağlantısı doğrulanamadığı için aktif dizin yapılamadı: {test.Error}"));
            }

            malatya.SetDirectorySyncEnabled(true, actor, now);
            ldap.SetEnabled(false, actor, now);
        }
        else if (string.Equals(target, "Ldap", StringComparison.OrdinalIgnoreCase))
        {
            // LDAP doğrulaması yapılır
            if (!ldap.HasValidConfiguration)
            {
                return Result<MalatyaApiSettingsView>.Failure(Error.Validation("organization.ldap_not_configured",
                    "Klasik LDAP sunucu ve arama tabanı ayarları yapılandırılmamış."));
            }

            if (ldapTester != null)
            {
                string? bindPassword = null;
                if (!string.IsNullOrEmpty(ldap.BindPasswordCipher))
                {
                    var unprotected = protector.Unprotect(ldap.BindPasswordCipher);
                    if (!unprotected.IsUnreadable) bindPassword = unprotected.Value;
                }
                var testResult = await ldapTester.TestConnectionAsync(
                    ldap.Host, ldap.Port, ldap.UseSsl, ldap.BindDn, bindPassword ?? "", ldap.TimeoutSeconds, ct);
                if (testResult.IsFailure)
                {
                    return Result<MalatyaApiSettingsView>.Failure(Error.Failure("organization.ldap_verification_failed",
                        $"LDAP sunucusuna bağlanılamadığı için aktif dizin yapılamadı: {testResult.Error.Description}"));
                }
            }

            malatya.SetDirectorySyncEnabled(false, actor, now);
            ldap.SetEnabled(true, actor, now);
        }
        else if (string.Equals(target, "None", StringComparison.OrdinalIgnoreCase))
        {
            malatya.SetDirectorySyncEnabled(false, actor, now);
            ldap.SetEnabled(false, actor, now);
        }
        else
        {
            return Result<MalatyaApiSettingsView>.Failure(Error.Validation("organization.invalid_directory_source",
                "Geçersiz dizin kaynağı. 'MalatyaApi', 'Ldap' veya 'None' olmalıdır."));
        }

        await uow.SaveChangesAsync(ct);
        return Result<MalatyaApiSettingsView>.Success(View(malatya, ldap.IsEnabled));
    }

    public async Task<Result<MalatyaSmsResult>> TestSmsAsync(TestSmsRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return Result<MalatyaSmsResult>.Failure(Error.Validation("organization.sms_message_required", "SMS mesajı zorunludur."));

        if (request.To == null || request.To.Count == 0 || request.To.All(string.IsNullOrWhiteSpace))
            return Result<MalatyaSmsResult>.Failure(Error.Validation("organization.sms_recipient_required", "En az bir alıcı telefon numarası zorunludur."));

        var result = request.IsOtp
            ? await malatyaApiClient.SendOtpSmsAsync(request.Message, request.To, request.Provider, ct)
            : await malatyaApiClient.SendSmsAsync(request.Message, request.To, request.Provider, ct);

        return Result<MalatyaSmsResult>.Success(result);
    }

    private static MalatyaApiSettingsView View(MalatyaApiSettings malatya, bool isLdapEnabled) => new(
        malatya.BaseUrl,
        malatya.UserName,
        !string.IsNullOrEmpty(malatya.PasswordCipher),
        malatya.SmsProvider,
        malatya.IsDirectorySyncEnabled,
        isLdapEnabled,
        malatya.LastTestedAt,
        malatya.LastTestStatus,
        malatya.Version,
        malatya.UpdatedAt,
        malatya.UpdatedBy);
}

