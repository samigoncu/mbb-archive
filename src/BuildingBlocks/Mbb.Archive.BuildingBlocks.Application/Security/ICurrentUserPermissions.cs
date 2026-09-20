namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>
/// İsteği yapan öznenin etkin izinleri. Modüller yetki kaynağına doğrudan
/// bağlanmasın diye bu soyutlama BuildingBlocks'ta durur; gerçek çözümleme
/// Host tarafından AccessControl üzerinden yapılır.
/// </summary>
public interface ICurrentUserPermissions
{
    /// <summary>Öznenin kimliği; kimlik yoksa "anonymous".</summary>
    string Subject { get; }

    /// <summary>
    /// Jetondan gelen dizin grupları / rol kodları. Grup bazlı paylaşım
    /// eşleşmesi bunun üzerinden yapılır.
    /// </summary>
    IReadOnlyCollection<string> Groups { get; }

    /// <summary>
    /// Bootstrap yöneticisi gibi tüm izinleri karşılayan durumlarda true döner;
    /// bu durumda izin listesi süzgeç olarak kullanılmamalıdır.
    /// </summary>
    Task<bool> HasAllPermissionsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyCollection<string>> GetAsync(CancellationToken cancellationToken);
}
