using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Domain.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

internal sealed class EfDirectorySettingsStore(OrganizationDbContext db) : IDirectorySettingsStore
{
    public Task<DirectorySettings> GetAsync(CancellationToken ct)
        => db.DirectorySettings.SingleAsync(x => x.Id == 1, ct);
}

/// <summary>
/// Dizin bağlama parolasını ASP.NET Data Protection ile şifreler.
/// </summary>
/// <remarks>
/// Anahtar halkası uygulamada; veritabanı yedeği tek başına parolayı açığa
/// çıkarmaz. Çözme başarısız olursa parola yeniden girilmelidir.
/// </remarks>
internal sealed class DirectorySecretProtector : IDirectorySecretProtector
{
    private const string Purpose = "Mbb.Archive.Organization.DirectoryCredentials.v1";

    private readonly IDataProtector _protector;
    private readonly ILogger<DirectorySecretProtector> _logger;

    public DirectorySecretProtector(IDataProtectionProvider provider, ILogger<DirectorySecretProtector> logger)
    {
        _protector = provider.CreateProtector(Purpose);
        _logger = logger;
    }

    public string Protect(string plainText) => _protector.Protect(plainText);

    public ProtectedSecret Unprotect(string? cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return ProtectedSecret.None;
        try { return new ProtectedSecret(_protector.Unprotect(cipherText), false); }
        catch (Exception exception)
        {
            // Kimliksiz bağlanmak sorunu gizlerdi: dizin çoğu kurulumda anonim
            // isteğe boş sonuç döner ve arıza parolada aranırdı.
            _logger.LogWarning(exception,
                "Dizin bağlama parolası çözülemedi; dizin kapatıldı, parola yeniden girilmelidir.");
            return ProtectedSecret.Unreadable;
        }
    }
}

internal sealed class DirectoryRuntime(IServiceScopeFactory scopes, IDirectorySecretProtector protector)
    : IDirectoryRuntime
{
    private volatile DirectoryRuntimeSettings _current = DirectoryRuntimeSettings.Empty;

    public DirectoryRuntimeSettings Current => _current;

    public async Task RefreshAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var settings = await scope.ServiceProvider.GetRequiredService<IDirectorySettingsStore>().GetAsync(ct);

        var bindPassword = protector.Unprotect(settings.BindPasswordCipher);

        _current = new DirectoryRuntimeSettings(
            settings.IsEnabled, settings.Host, settings.Port, settings.UseSsl, settings.BindDn,
            bindPassword.Value,
            settings.UserSearchBase, settings.UnitSearchBase, settings.UserFilter, settings.UnitFilter,
            settings.UnitAttribute, settings.GroupAttribute, settings.DisplayNameAttribute,
            settings.MailAttribute, settings.TimeoutSeconds, settings.ProvisionOnLogin,
            bindPassword.IsUnreadable);
    }
}

/// <summary>Açılışta yükler, çok örnekli kurulumda geri kalmasın diye düzenli tazeler.</summary>
internal sealed class DirectoryRuntimeRefresher(
    IDirectoryRuntime runtime,
    ILogger<DirectoryRuntimeRefresher> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await runtime.RefreshAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Dizin ayarı okunamadı; bir sonraki denemede yeniden alınacak.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
