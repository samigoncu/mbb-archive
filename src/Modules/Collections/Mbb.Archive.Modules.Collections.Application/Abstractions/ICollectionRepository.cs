using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Collections.Application.Collections;
using Mbb.Archive.Modules.Collections.Domain.Collections;

namespace Mbb.Archive.Modules.Collections.Application.Abstractions;

public interface ICollectionRepository
{
    Task AddAsync(DocumentCollection collection, CancellationToken cancellationToken);

    Task<DocumentCollection?> GetAsync(
        DocumentCollectionId id,
        CancellationToken cancellationToken);

    void Remove(DocumentCollection collection);
}

public interface ICollectionQueries
{
    /// <param name="subject">
    /// Paylaşılmayan koleksiyonlar yalnızca sahibine görünür; süzgeç sunucuda
    /// uygulanır (§21).
    /// </param>
    Task<PagedResult<CollectionListItem>> GetPageAsync(
        PageRequest page,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken);

    Task<CollectionDetails?> GetDetailsAsync(
        Guid id,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken);

    /// <summary>Bir belgenin hangi koleksiyonlarda yer aldığını döndürür.</summary>
    Task<IReadOnlyList<CollectionListItem>> GetForDocumentAsync(
        Guid documentId,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken);
}
