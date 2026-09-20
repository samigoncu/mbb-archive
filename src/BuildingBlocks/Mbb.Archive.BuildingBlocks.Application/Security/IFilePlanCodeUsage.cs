namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>
/// Bir SDP konu kodunun modüllerde kullanılıp kullanılmadığını bildirir.
/// </summary>
/// <remarks>
/// <see cref="IOrganizationUnitUsage"/> ile aynı desen: modüller kendi
/// tablolarını ya da belge içeriğini açmadan yalnız "başvuru var" bilgisini
/// verir. Kullanımdaki bir konu kodu silinemez; silinirse belgelerin,
/// dijital dosyaların ve fiziksel klasörlerin sınıflandırma geçmişi kopar.
/// </remarks>
public interface IFilePlanCodeUsage
{
    Task<bool> HasReferencesAsync(string code, CancellationToken ct);
}
