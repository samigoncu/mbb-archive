namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>
/// Belge kimliği listesini çağıranın görebildiklerine indirger.
/// <para>
/// Arşiv kaydı, koleksiyon, harita ilişkisi ve fiziksel dosya gibi uçlar belge
/// kimliği yayınlar; her birinin kendi tablosuna sahiplik bilgisini
/// denormalize etmek yerine kapsam kararı tek yerden sorulur. Böylece kural
/// bir tane kalır ve modüller Documents tablolarına bağlanmaz (§24).
/// </para>
/// </summary>
public interface IDocumentVisibility
{
    /// <summary>
    /// Verilen kimliklerden yalnız görünür olanları döndürür. Boş liste
    /// verilirse boş döner; hiçbir koşulda girdiyi olduğu gibi geçirmez.
    /// </summary>
    Task<IReadOnlySet<Guid>> FilterAsync(
        IReadOnlyCollection<Guid> documentIds,
        CancellationToken cancellationToken);
}
