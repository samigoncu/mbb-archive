namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface ISearchProjectionQueries
{
    Task<string?> GetOcrJsonStorageKeyAsync(
        Guid documentId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Çıkarılmış/OCR metninin artifact anahtarı. Projeksiyon yoksa ya da metin
    /// henüz üretilmediyse null döner.
    /// </summary>
    Task<string?> GetTextStorageKeyAsync(
        Guid documentId,
        CancellationToken cancellationToken);
}
