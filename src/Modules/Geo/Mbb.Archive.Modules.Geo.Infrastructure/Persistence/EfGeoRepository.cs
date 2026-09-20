using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Domain.Relations;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence;

internal sealed class EfGeoRepository : IGeoRepository, IGeoQueries
{
    private readonly GeoDbContext _db;

    public EfGeoRepository(GeoDbContext db) => _db = db;

    public async Task AddEntityAsync(GeoEntity entity, CancellationToken cancellationToken)
        => await _db.Entities.AddAsync(entity, cancellationToken);

    public Task<GeoEntity?> GetEntityAsync(GeoEntityId id, CancellationToken cancellationToken)
        => _db.Entities.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<GeoEntity?> FindEntityAsync(
        string provider,
        string layerName,
        string featureId,
        CancellationToken cancellationToken)
        => _db.Entities.SingleOrDefaultAsync(
            x => x.Provider == provider
                && x.LayerName == layerName
                && x.FeatureId == featureId,
            cancellationToken);

    public async Task AddRelationAsync(
        DocumentGeoRelation relation,
        CancellationToken cancellationToken)
        => await _db.Relations.AddAsync(relation, cancellationToken);

    public Task<DocumentGeoRelation?> GetRelationAsync(
        Guid id,
        CancellationToken cancellationToken)
        => _db.Relations.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ActiveGeoRelationSnapshot>> GetActiveRelationSnapshotAsync(
        Guid documentId,
        CancellationToken cancellationToken)
        => await (
            from relation in _db.Relations.AsNoTracking()
            join entity in _db.Entities.AsNoTracking()
                on relation.GeoEntityId equals entity.Id
            where relation.DocumentId == documentId && relation.ValidTo == null
            orderby entity.Name
            select new ActiveGeoRelationSnapshot(
                entity.Id.Value,
                entity.Name,
                entity.EntityType.ToString(),
                entity.LayerName,
                relation.RelationType.ToString()))
            .ToListAsync(cancellationToken);

    public Task<DocumentGeoRelation?> FindActiveRelationAsync(
        Guid documentId,
        GeoEntityId geoEntityId,
        GeoRelationType relationType,
        CancellationToken cancellationToken)
        => _db.Relations.FirstOrDefaultAsync(
            x => x.DocumentId == documentId
                && x.GeoEntityId == geoEntityId
                && x.RelationType == relationType
                && x.ValidTo == null,
            cancellationToken);

    public async Task<PagedResult<GeoEntitySummary>> SearchEntitiesAsync(
        PageRequest page,
        string? search,
        string? entityType,
        GeoBoundingBox? viewport,
        CancellationToken cancellationToken)
    {
        var query = _db.Entities.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => EF.Functions.ILike(x.Name, $"%{search.Trim()}%"));

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = Enum.TryParse<GeoEntityType>(entityType, true, out var parsed)
                ? query.Where(x => x.EntityType == parsed)
                : query.Where(_ => false);
        }

        if (viewport is { } box)
        {
            // Sınırlayıcı kutu kesişimi; kesin geometri yüklemi PostGIS ister.
            query = query.Where(x =>
                x.BoundingBox.MinLongitude <= box.MaxLongitude
                && x.BoundingBox.MaxLongitude >= box.MinLongitude
                && x.BoundingBox.MinLatitude <= box.MaxLatitude
                && x.BoundingBox.MaxLatitude >= box.MinLatitude);
        }

        var total = await query.LongCountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.Name)
            .ThenBy(x => x.Id)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new GeoEntitySummary(
                x.Id.Value,
                x.Provider,
                x.LayerName,
                x.FeatureId,
                x.EntityType.ToString(),
                x.Name,
                x.ExternalReference,
                x.BoundingBox.MinLongitude,
                x.BoundingBox.MinLatitude,
                x.BoundingBox.MaxLongitude,
                x.BoundingBox.MaxLatitude,
                _db.Relations.Count(r => r.GeoEntityId == x.Id && r.ValidTo == null)))
            .ToListAsync(cancellationToken);

        return new PagedResult<GeoEntitySummary>(items, page.Page, page.PageSize, total);
    }

    public Task<GeoEntityDetails?> GetEntityAsync(Guid id, CancellationToken cancellationToken)
        => _db.Entities
            .AsNoTracking()
            .Where(x => x.Id == new GeoEntityId(id))
            .Select(x => new GeoEntityDetails(
                x.Id.Value,
                x.Provider,
                x.LayerName,
                x.FeatureId,
                x.EntityType.ToString(),
                x.Name,
                x.GeoJson,
                x.PropertiesJson,
                x.ExternalReference,
                x.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<GeoRelatedDocument>> GetRelatedDocumentsAsync(
        Guid geoEntityId,
        bool activeOnly,
        CancellationToken cancellationToken)
    {
        var entityId = new GeoEntityId(geoEntityId);
        var query = _db.Relations.AsNoTracking().Where(x => x.GeoEntityId == entityId);

        if (activeOnly)
            query = query.Where(x => x.ValidTo == null);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new GeoRelatedDocument(
                x.DocumentId,
                x.Id,
                x.RelationType.ToString(),
                x.ValidFrom,
                x.ValidTo,
                x.ValidTo == null,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<GeoRelationDetails>> GetDocumentRelationsAsync(
        Guid documentId,
        CancellationToken cancellationToken)
        => await (
            from relation in _db.Relations.AsNoTracking()
            join entity in _db.Entities.AsNoTracking()
                on relation.GeoEntityId equals entity.Id
            where relation.DocumentId == documentId
            orderby relation.ValidTo == null descending, relation.CreatedAt descending
            select new GeoRelationDetails(
                relation.Id,
                relation.DocumentId,
                entity.Id.Value,
                entity.Name,
                entity.EntityType.ToString(),
                entity.LayerName,
                relation.RelationType.ToString(),
                relation.ValidFrom,
                relation.ValidTo,
                relation.ValidTo == null,
                relation.CreatedBy,
                relation.CreatedAt))
            .ToListAsync(cancellationToken);
}
