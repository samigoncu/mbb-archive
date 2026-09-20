namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>
/// İsteği yapan öznenin erişim kapsamı. Modüller kapsamı kendileri hesaplamaz;
/// Host, Organization ve AccessControl modüllerini birleştirerek üretir. Bu
/// sayede Documents veya Search, Organization tablolarına bağlanmaz (§24).
/// </summary>
public interface ICurrentUserScope
{
    Task<AccessScope> GetAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Yetki kararının tüm girdisi. Bir istekte bir kez hesaplanır ve o istek
/// boyunca yeniden kullanılır.
/// </summary>
/// <param name="Unrestricted">
/// <c>documents.read.all</c> gibi kapsam üstü izin. Doğruysa süzgeç uygulanmaz;
/// Teftiş ve Genel Sekreterlik bu yolla her şeyi görür.
/// </param>
/// <param name="UnitPaths">
/// Öznenin birimleri ve alt ağaçları, materyalize yol biçiminde
/// (<c>/GS/BID/</c>). Süzgeç önek eşleşmesiyle çalışır.
/// </param>
/// <param name="GrantedDocumentIds">Doğrudan paylaşımla açılan belgeler.</param>
/// <param name="GrantedFilePlanCodes">Dosya planı dalı üzerinden açılan kapsam.</param>
public sealed record AccessScope(
    string Subject,
    bool Unrestricted,
    IReadOnlyList<string> UnitPaths,
    IReadOnlyList<Guid> UnitIds,
    IReadOnlyList<Guid> GrantedDocumentIds,
    IReadOnlyList<string> GrantedFilePlanCodes,
    Guid? PrimaryUnitId = null,
    string? PrimaryUnitPath = null)
{
    /// <summary>
    /// Hiçbir birime üye olmayan ve paylaşım almamış özne. Süzgeç bu durumda
    /// boş sonuç döndürür — "hepsini göster"e düşmez.
    /// </summary>
    public static AccessScope Empty(string subject)
        => new(subject, false, [], [], [], []);

    /// <summary>
    /// Yeni belgenin sahiplenileceği birim. Birincil üyelik yoksa belge
    /// sahipsiz kalır ve kapsam süzgeci onu kimseye göstermez — bu bilinçli:
    /// birimi belirsiz bir belge sessizce herkese açılmamalıdır.
    /// </summary>
    public bool CanOwnDocuments => PrimaryUnitId is not null && PrimaryUnitPath is not null;

    public bool SeesNothing
        => !Unrestricted
            && UnitPaths.Count == 0
            && GrantedDocumentIds.Count == 0
            && GrantedFilePlanCodes.Count == 0;
}
