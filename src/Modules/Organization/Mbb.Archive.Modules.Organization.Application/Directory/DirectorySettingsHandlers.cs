using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Organization.Domain.Directory;

namespace Mbb.Archive.Modules.Organization.Application.Directory;

public interface IDirectorySettingsStore
{
    Task<DirectorySettings> GetAsync(CancellationToken ct);
}

/// <summary>Bağlama parolasını şifreler ve çözer; açık parola bu portun iki ucunda kalır.</summary>
public interface IDirectorySecretProtector
{
    string Protect(string plainText);

    /// <summary>Anahtar döndüyse ya da metin bozuksa <c>IsUnreadable</c> döner.</summary>
    ProtectedSecret Unprotect(string? cipherText);
}

/// <summary>
/// LDAP ayarlarının çalışma anındaki görüntüsü.
/// </summary>
/// <remarks>
/// `LdapDirectory` eşzamanlı seçenek okur; her çağrıda veritabanına gitmemek
/// için anlık görüntü açılışta yüklenir, yönetim ekranındaki değişiklikten
/// sonra tazelenir ve düzenli aralıkla yenilenir.
/// </remarks>
public interface IDirectoryRuntime
{
    DirectoryRuntimeSettings Current { get; }
    Task RefreshAsync(CancellationToken ct);
}

public sealed record DirectoryRuntimeSettings(
    bool IsEnabled, string Host, int Port, bool UseSsl, string BindDn, string? BindPassword,
    string UserSearchBase, string UnitSearchBase, string UserFilter, string UnitFilter,
    string UnitAttribute, string GroupAttribute, string DisplayNameAttribute, string MailAttribute,
    int TimeoutSeconds, bool ProvisionOnLogin,
    /// <summary>Parola kayıtlı ama çözülemiyor; dizine kimliksiz bağlanılmamalı.</summary>
    bool BindPasswordUnreadable = false)
{
    public static readonly DirectoryRuntimeSettings Empty = new(
        false, "", 636, true, "", null, "", "",
        "(&(objectClass=user)(sAMAccountName={0}))", "(objectClass=organizationalUnit)",
        "department", "memberOf", "displayName", "mail", 20, true);

    /// <remarks>
    /// Parola çözülemiyorsa yapılandırma geçerli sayılmaz: servis hesabı
    /// olmadan yapılan anonim bağlantı çoğu dizinde boş sonuç döndürür ve
    /// sorun parolada değil şifreleme anahtarındayken parola aranır.
    /// </remarks>
    public bool IsConfigured => IsEnabled && Host.Length > 0 && UserSearchBase.Length > 0
        && !BindPasswordUnreadable;
}

public sealed record DirectorySettingsView(
    bool IsEnabled, string Host, int Port, bool UseSsl, string BindDn,
    /// <summary>Parolanın kendisi hiçbir zaman dönmez; yalnız tanımlı olup olmadığı.</summary>
    bool HasBindPassword,
    /// <summary>Kayıtlı parola çözülemiyor: yöneticinin yeniden girmesi gerekir.</summary>
    bool BindPasswordUnreadable,
    string UserSearchBase, string UnitSearchBase, string UserFilter, string UnitFilter,
    string UnitAttribute, string GroupAttribute, string DisplayNameAttribute, string MailAttribute,
    int TimeoutSeconds, bool ProvisionOnLogin,
    long Version, DateTimeOffset? UpdatedAt, string UpdatedBy);

public sealed record SaveDirectorySettings(
    bool IsEnabled, string Host, int Port, bool UseSsl, string BindDn,
    /// <summary>null: parolayı değiştirme · "": parolayı sil · dolu: yeni parola.</summary>
    string? BindPassword,
    string UserSearchBase, string UnitSearchBase, string UserFilter, string UnitFilter,
    string UnitAttribute, string GroupAttribute, string DisplayNameAttribute, string MailAttribute,
    int TimeoutSeconds, bool ProvisionOnLogin, long ExpectedVersion);

public interface ILdapConnectionTester
{
    Task<Result<string>> TestConnectionAsync(string host, int port, bool useSsl, string bindDn, string password, int timeoutSeconds, CancellationToken ct);
}

public sealed record TestLdapConnectionRequest(
    string? Host,
    int? Port,
    bool? UseSsl,
    string? BindDn,
    string? BindPassword,
    int? TimeoutSeconds);

public sealed class DirectorySettingsHandlers(
    IDirectorySettingsStore store,
    IMalatyaApiSettingsStore malatyaStore,
    IDirectorySecretProtector protector,
    ILdapConnectionTester connectionTester,
    IUnitOfWork<OrganizationBoundary> uow,
    ICurrentUserPermissions user,
    TimeProvider time)
{
    public async Task<DirectorySettingsView> GetAsync(CancellationToken ct)
    {
        var settings = await store.GetAsync(ct);
        return View(settings, protector.Unprotect(settings.BindPasswordCipher).IsUnreadable);
    }

    public async Task<Result<string>> TestConnectionAsync(TestLdapConnectionRequest? request, CancellationToken ct)
    {
        var settings = await store.GetAsync(ct);
        var host = !string.IsNullOrWhiteSpace(request?.Host) ? request.Host : settings.Host;
        var port = request?.Port ?? settings.Port;
        var useSsl = request?.UseSsl ?? settings.UseSsl;
        var bindDn = request?.BindDn ?? settings.BindDn;
        var timeout = request?.TimeoutSeconds ?? settings.TimeoutSeconds;

        string? password = null;
        if (!string.IsNullOrEmpty(request?.BindPassword))
        {
            password = request.BindPassword;
        }
        else if (!string.IsNullOrEmpty(settings.BindPasswordCipher))
        {
            var unprotected = protector.Unprotect(settings.BindPasswordCipher);
            if (!unprotected.IsUnreadable) password = unprotected.Value;
        }

        if (string.IsNullOrWhiteSpace(host))
            return Result<string>.Failure(Error.Validation("organization.ldap_host_required", "LDAP sunucu adresi zorunludur."));

        return await connectionTester.TestConnectionAsync(host, port, useSsl, bindDn, password ?? "", timeout, ct);
    }

    public async Task<Result<DirectorySettingsView>> SaveAsync(SaveDirectorySettings request, CancellationToken ct)
    {
        var settings = await store.GetAsync(ct);
        if (request.ExpectedVersion != settings.Version)
            return Result<DirectorySettingsView>.Failure(Error.Conflict("organization.directory_conflict",
                "Dizin ayarı başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin."));

        try
        {
            settings.Change(
                request.Host, request.Port, request.UseSsl, request.BindDn,
                request.BindPassword switch { null => null, "" => "", var value => protector.Protect(value) },
                request.UserSearchBase, request.UnitSearchBase, request.UserFilter, request.UnitFilter,
                request.UnitAttribute, request.GroupAttribute, request.DisplayNameAttribute, request.MailAttribute,
                request.TimeoutSeconds, request.ProvisionOnLogin, request.IsEnabled,
                user.Subject, time.GetUtcNow());

            if (request.IsEnabled)
            {
                var malatya = await malatyaStore.GetAsync(ct);
                if (malatya.IsDirectorySyncEnabled)
                {
                    malatya.SetDirectorySyncEnabled(false, user.Subject, time.GetUtcNow());
                }
            }
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<DirectorySettingsView>.Failure(Error.Validation("organization.directory_invalid", exception.Message));
        }

        await uow.SaveChangesAsync(ct);
        // Kaydedilen parola tanım gereği okunabilir; bayrak sıfırlanır.
        return Result<DirectorySettingsView>.Success(View(settings, false));
    }

    private static DirectorySettingsView View(DirectorySettings settings, bool bindPasswordUnreadable) => new(
        settings.IsEnabled, settings.Host, settings.Port, settings.UseSsl, settings.BindDn,
        !string.IsNullOrEmpty(settings.BindPasswordCipher),
        bindPasswordUnreadable,
        settings.UserSearchBase, settings.UnitSearchBase, settings.UserFilter, settings.UnitFilter,
        settings.UnitAttribute, settings.GroupAttribute, settings.DisplayNameAttribute, settings.MailAttribute,
        settings.TimeoutSeconds, settings.ProvisionOnLogin,
        settings.Version, settings.UpdatedAt, settings.UpdatedBy);
}
