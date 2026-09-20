using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Domain.Relations;

namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

public interface IGeoRepository
{
    Task AddEntityAsync(GeoEntity entity, CancellationToken cancellationToken);

    Task<GeoEntity?> GetEntityAsync(GeoEntityId id, CancellationToken cancellationToken);

    /// <summary>Aynı feature ikinci kez içe aktarılırsa kopya oluşmasın diye.</summary>
    Task<GeoEntity?> FindEntityAsync(
        string provider,
        string layerName,
        string featureId,
        CancellationToken cancellationToken);

    Task AddRelationAsync(
        DocumentGeoRelation relation,
        CancellationToken cancellationToken);

    Task<DocumentGeoRelation?> GetRelationAsync(
        Guid id,
        CancellationToken cancellationToken);

    /// <summary>
    /// Belgenin aktif ilişkilerini nesne adlarıyla döndürür; arama
    /// projeksiyonuna yayınlanacak bütün küme buradan kurulur.
    /// </summary>
    Task<IReadOnlyList<ActiveGeoRelationSnapshot>> GetActiveRelationSnapshotAsync(
        Guid documentId,
        CancellationToken cancellationToken);

    Task<DocumentGeoRelation?> FindActiveRelationAsync(
        Guid documentId,
        GeoEntityId geoEntityId,
        GeoRelationType relationType,
        CancellationToken cancellationToken);
}

public interface IGeoQueries
{
    Task<PagedResult<GeoEntitySummary>> SearchEntitiesAsync(
        PageRequest page,
        string? search,
        string? entityType,
        GeoBoundingBox? viewport,
        CancellationToken cancellationToken);

    Task<GeoEntityDetails?> GetEntityAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<GeoRelatedDocument>> GetRelatedDocumentsAsync(
        Guid geoEntityId,
        bool activeOnly,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<GeoRelationDetails>> GetDocumentRelationsAsync(
        Guid documentId,
        CancellationToken cancellationToken);
}

/// <summary>Yayınlanacak ilişki künyesi.</summary>
public sealed record ActiveGeoRelationSnapshot(
    Guid GeoEntityId,
    string Name,
    string EntityType,
    string LayerName,
    string RelationType);
