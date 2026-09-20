namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>
/// Şifreli saklanan bir sırrın çözülmüş hâli ve çözülüp çözülemediği.
/// </summary>
/// <remarks>
/// <para>
/// "Sır yok" ile "sır var ama çözülemedi" ayrımı taşınmalıdır. İkisi de
/// <c>null</c> dönseydi, şifreleme anahtarı kaybolduğunda ya da döndüğünde
/// entegrasyonlar sessizce kimliksiz bağlanır; hata ancak karşı sunucunun
/// yetkisiz yanıtlarından, çoğu zaman aylar sonra anlaşılırdı.
/// </para>
/// <para>
/// Bu yüzden çözülemeyen sır, çağıranın isteği <em>göndermemesi</em> gereken
/// bir durumdur: yönetici parolayı yeniden girmelidir.
/// </para>
/// </remarks>
public readonly record struct ProtectedSecret(string? Value, bool IsUnreadable)
{
    /// <summary>Kayıtlı sır yok; bu bir hata değildir.</summary>
    public static readonly ProtectedSecret None = new(null, false);

    /// <summary>Çözülemeyen sır.</summary>
    public static readonly ProtectedSecret Unreadable = new(null, true);
}
