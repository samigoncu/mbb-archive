using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Collections.Application.Abstractions;
using Mbb.Archive.Modules.Collections.Application.Collections;
using Mbb.Archive.Modules.Collections.Domain.Collections;

namespace Mbb.Archive.Modules.Collections.Infrastructure.Persistence;

internal sealed class EfCollectionRepository : ICollectionRepository, ICollectionQueries
{
    private readonly CollectionsDbContext _db;

    public EfCollectionRepository(CollectionsDbContext db) => _db = db;

    public async Task AddAsync(
        DocumentCollection collection,
        CancellationToken cancellationToken)
        => await _db.Collections.AddAsync(collection, cancellationToken);

    public Task<DocumentCollection?> GetAsync(
        DocumentCollectionId id,
        CancellationToken cancellationToken)
        => _db.Collections
            .Include(x => x.Items)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public void Remove(DocumentCollection collection)
        => _db.Collections.Remove(collection);

    public async Task<PagedResult<CollectionListItem>> GetPageAsync(
        PageRequest page,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken)
    {
        var query = Visible(subject, includeAll);

        var total = await query.LongCountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.Name)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new CollectionListItem(
                x.Id.Value,
                x.Name,
                x.Description,
                x.OwnerSubject,
                x.IsShared,
                x.Items.Count,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<CollectionListItem>(
            items,
            page.Page,
            page.PageSize,
            total);
    }

    public Task<CollectionDetails?> GetDetailsAsync(
        Guid id,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken)
        => Visible(subject, includeAll)
            .Where(x => x.Id == new DocumentCollectionId(id))
            .Select(x => new CollectionDetails(
                x.Id.Value,
                x.Name,
                x.Description,
                x.OwnerSubject,
                x.IsShared,
                x.CreatedAt,
                x.Items
                    .OrderByDescending(i => i.AddedAt)
                    .Select(i => new CollectionItemDetails(
                        i.DocumentId,
                        i.AddedBy,
                        i.AddedAt))
                    .ToList()))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<CollectionListItem>> GetForDocumentAsync(
        Guid documentId,
        string subject,
        bool includeAll,
        CancellationToken cancellationToken)
        => await Visible(subject, includeAll)
            .Where(x => x.Items.Any(i => i.DocumentId == documentId))
            .OrderBy(x => x.Name)
            .Select(x => new CollectionListItem(
                x.Id.Value,
                x.Name,
                x.Description,
                x.OwnerSubject,
                x.IsShared,
                x.Items.Count,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

    /// <summary>
    /// Görünürlük süzgeci: paylaşılan koleksiyonlar herkese, paylaşılmayanlar
    /// yalnız sahibine. Süzgeç sorguya gömülür; istemciden gelen bir bayrağa
    /// bırakılmaz.
    /// </summary>
    private IQueryable<DocumentCollection> Visible(string subject, bool includeAll)
    {
        var query = _db.Collections.AsNoTracking();

        return includeAll
            ? query
            : query.Where(x => x.IsShared || x.OwnerSubject == subject);
    }
}
