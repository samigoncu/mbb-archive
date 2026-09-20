using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Geo.Application.Abstractions;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

/// <summary>
/// CBS servis parolalarını ASP.NET Data Protection ile şifreler.
/// </summary>
/// <remarks>
/// Anahtar halkası uygulama tarafından yönetilir; veritabanı yedeği tek başına
/// parolayı açığa çıkarmaz. Anahtar kaybolur ya da döner ise çözme başarısız
/// olur — bu durumda servis kimliksiz denenmez, parolanın yeniden girilmesi
/// gerektiği yönetim ekranına bildirilir.
/// </remarks>
internal sealed class GeoSecretProtector : IGeoSecretProtector
{
    private const string Purpose = "Mbb.Archive.Geo.ServiceCredentials.v1";

    private readonly IDataProtector _protector;
    private readonly ILogger<GeoSecretProtector> _logger;

    public GeoSecretProtector(IDataProtectionProvider provider, ILogger<GeoSecretProtector> logger)
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
            // Parolanın kendisi loglanmaz; yalnız çözülemediği bilgisi geçer.
            _logger.LogWarning(exception,
                "CBS servis parolası çözülemedi; servis kimlikli isteklere kapatıldı, parola yeniden girilmelidir.");
            return new ProtectedSecret(null, true);
        }
    }
}
