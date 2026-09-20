using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Geo.Domain.Relations;

namespace Mbb.Archive.Modules.Geo.Application.Entities;

public static class GeoErrors
{
    public static readonly Error EntityNotFound = Error.NotFound(
        "geo.entity_not_found",
        "Geographic entity was not found.");

    public static readonly Error RelationNotFound = Error.NotFound(
        "geo.relation_not_found",
        "Document-geography relation was not found.");

    public static Error Invalid(string message)
        => Error.Validation("geo.invalid", message);

    public static Error Conflict(string message)
        => Error.Conflict("geo.conflict", message);
}

public sealed record SearchGeoEntitiesQuery(
    int Page = 1,
    int PageSize = 50,
    string? Search = null,
    string? EntityType = null,
    string? Bbox = null) : IQuery<PagedResult<GeoEntitySummary>>;

public sealed record GetGeoEntityQuery(Guid Id) : IQuery<GeoEntityDetails>;

public sealed record GetGeoEntityDocumentsQuery(Guid Id, bool ActiveOnly = false)
    : IQuery<IReadOnlyList<GeoRelatedDocument>>;

public sealed record GetDocumentGeoRelationsQuery(Guid DocumentId)
    : IQuery<IReadOnlyList<GeoRelationDetails>>;

public sealed class GeoQueryHandlers
{
    private readonly IGeoQueries _queries;
    private readonly IDocumentVisibility _visibility;

    public GeoQueryHandlers(IGeoQueries queries, IDocumentVisibility visibility)
    {
        _queries = queries;
        _visibility = visibility;
    }

    public async Task<Result<PagedResult<GeoEntitySummary>>> Handle(
        SearchGeoEntitiesQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<GeoEntitySummary>>.Failure(pageResult.Error);

        GeoBoundingBox? viewport = null;

        if (!string.IsNullOrWhiteSpace(query.Bbox))
        {
            if (!GeoBbox.TryParse(query.Bbox, out var parsed))
            {
                return Result<PagedResult<GeoEntitySummary>>.Failure(
                    GeoErrors.Invalid(
                        "bbox must be 'minLon,minLat,maxLon,maxLat' in WGS 84."));
            }

            viewport = parsed;
        }

        var result = await _queries.SearchEntitiesAsync(
            pageResult.Value,
            query.Search,
            query.EntityType,
            viewport,
            cancellationToken);

        return Result<PagedResult<GeoEntitySummary>>.Success(result);
    }

    public async Task<Result<GeoEntityDetails>> Handle(
        GetGeoEntityQuery query,
        CancellationToken cancellationToken)
    {
        var details = await _queries.GetEntityAsync(query.Id, cancellationToken);

        return details is null
            ? Result<GeoEntityDetails>.Failure(GeoErrors.EntityNotFound)
            : Result<GeoEntityDetails>.Success(details);
    }

    /// <summary>
    /// Haritadan belgeye geçiş de kapsam süzgecine tabidir; aksi hâlde bir
    /// yola tıklayan herkes başka birimin kararlarını listeler.
    /// </summary>
    public async Task<Result<IReadOnlyList<GeoRelatedDocument>>> Handle(
        GetGeoEntityDocumentsQuery query,
        CancellationToken cancellationToken)
    {
        var related = await _queries.GetRelatedDocumentsAsync(
            query.Id,
            query.ActiveOnly,
            cancellationToken);

        var visible = await _visibility.FilterAsync(
            related.Select(x => x.DocumentId).ToArray(),
            cancellationToken);

        return Result<IReadOnlyList<GeoRelatedDocument>>.Success(
            related.Where(x => visible.Contains(x.DocumentId)).ToArray());
    }

    public async Task<Result<IReadOnlyList<GeoRelationDetails>>> Handle(
        GetDocumentGeoRelationsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<GeoRelationDetails>>.Success(
            await _queries.GetDocumentRelationsAsync(
                query.DocumentId,
                cancellationToken));
}


/// <summary>
/// `minLon,minLat,maxLon,maxLat` biçimindeki görünüm penceresini çözer.
/// Ters çevrilmiş kutu sessizce düzeltilmez; istek reddedilir.
/// </summary>
public static class GeoBbox
{
    public static bool TryParse(string value, out GeoBoundingBox box)
    {
        box = GeoBoundingBox.Empty;

        var parts = value.Split(',', StringSplitOptions.TrimEntries);

        if (parts.Length != 4)
            return false;

        var numbers = new double[4];

        for (var i = 0; i < 4; i++)
        {
            if (!double.TryParse(
                    parts[i],
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out numbers[i]))
            {
                return false;
            }
        }

        if (numbers[0] > numbers[2] || numbers[1] > numbers[3])
            return false;

        box = new GeoBoundingBox(numbers[0], numbers[1], numbers[2], numbers[3]);
        return true;
    }
}

public sealed record ImportGeoEntityCommand(
    string Provider,
    string LayerName,
    string FeatureId,
    string EntityType,
    string Name,
    string GeoJson,
    string? PropertiesJson,
    string? ExternalReference) : ICommand<Guid>;

public sealed record CreateGeoRelationCommand(
    Guid DocumentId,
    Guid GeoEntityId,
    string RelationType,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo) : ICommand<Guid>;

public sealed record CloseGeoRelationCommand(Guid DocumentId, Guid RelationId) : ICommand;

public sealed class GeoCommandHandlers
{
    private readonly IGeoRepository _repository;
    private readonly IUnitOfWork<GeoBoundary> _unitOfWork;
    private readonly IOutbox<GeoBoundary> _outbox;
    private readonly ICurrentUserPermissions _currentUser;
    private readonly TimeProvider _timeProvider;

    public GeoCommandHandlers(
        IGeoRepository repository,
        IUnitOfWork<GeoBoundary> unitOfWork,
        IOutbox<GeoBoundary> outbox,
        ICurrentUserPermissions currentUser,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _outbox = outbox;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Feature'ı yerel kataloğa alır. Aynı sağlayıcı/katman/feature ikinci kez
    /// gelirse yeni kayıt açılmaz, mevcut kayıt tazelenir.
    /// </summary>
    public async Task<Result<Guid>> Handle(
        ImportGeoEntityCommand command,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<GeoEntityType>(command.EntityType, true, out var entityType))
            return Result<Guid>.Failure(GeoErrors.Invalid($"Unknown entity type '{command.EntityType}'."));

        if (!GeoJsonBounds.TryCompute(command.GeoJson, out var boundingBox, out var geometryError))
            return Result<Guid>.Failure(GeoErrors.Invalid(geometryError!));

        try
        {
            var now = _timeProvider.GetUtcNow();

            var existing = await _repository.FindEntityAsync(
                command.Provider,
                command.LayerName,
                command.FeatureId,
                cancellationToken);

            if (existing is not null)
            {
                existing.Refresh(
                    command.Name,
                    command.GeoJson,
                    command.PropertiesJson,
                    boundingBox);

                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result<Guid>.Success(existing.Id.Value);
            }

            var entity = GeoEntity.Import(
                command.Provider,
                command.LayerName,
                command.FeatureId,
                entityType,
                command.Name,
                command.GeoJson,
                command.PropertiesJson,
                command.ExternalReference,
                boundingBox,
                now);

            await _repository.AddEntityAsync(entity, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(entity.Id.Value);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(GeoErrors.Invalid(exception.Message));
        }
    }

    public async Task<Result<Guid>> Handle(
        CreateGeoRelationCommand command,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<GeoRelationType>(command.RelationType, true, out var relationType))
        {
            return Result<Guid>.Failure(
                GeoErrors.Invalid($"Unknown relation type '{command.RelationType}'."));
        }

        var entityId = new GeoEntityId(command.GeoEntityId);
        var entity = await _repository.GetEntityAsync(entityId, cancellationToken);

        if (entity is null || !entity.IsActive)
            return Result<Guid>.Failure(GeoErrors.EntityNotFound);

        var duplicate = await _repository.FindActiveRelationAsync(
            command.DocumentId,
            entityId,
            relationType,
            cancellationToken);

        if (duplicate is not null)
            return Result<Guid>.Success(duplicate.Id);

        try
        {
            var relation = DocumentGeoRelation.Create(
                command.DocumentId,
                entityId,
                relationType,
                command.ValidFrom,
                command.ValidTo,
                _currentUser.Subject,
                _timeProvider.GetUtcNow());

            entity.RegisterRelationChange();
            await _repository.AddRelationAsync(relation, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await PublishRelationsChangedAsync(command.DocumentId, cancellationToken);

            return Result<Guid>.Success(relation.Id);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(GeoErrors.Invalid(exception.Message));
        }
    }

    /// <summary>
    /// Belgenin güncel aktif ilişki kümesini yayınlar. Fark değil bütün küme
    /// gönderilir; arama projeksiyonu listeyi olduğu gibi değiştirir ve olay
    /// sırası bozulsa da tutarlı kalır.
    /// </summary>
    private async Task PublishRelationsChangedAsync(
        Guid documentId,
        CancellationToken cancellationToken)
    {
        var snapshot = await _repository.GetActiveRelationSnapshotAsync(
            documentId,
            cancellationToken);

        _outbox.Enqueue(
            new DocumentGeoRelationsChangedIntegrationEvent(
                Guid.CreateVersion7(),
                documentId,
                snapshot
                    .Select(x => new DocumentGeoRelationEntry(
                        x.GeoEntityId,
                        x.Name,
                        x.EntityType,
                        x.LayerName,
                        x.RelationType))
                    .ToArray(),
                _timeProvider.GetUtcNow()));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// İlişkiyi kapatır. Kayıt silinmez; hangi kararın hangi dönemde hangi
    /// nesneyi etkilediği geçmişte kalır.
    /// </summary>
    public async Task<Result> Handle(
        CloseGeoRelationCommand command,
        CancellationToken cancellationToken)
    {
        var relation = await _repository.GetRelationAsync(command.RelationId, cancellationToken);

        if (relation is null || relation.DocumentId != command.DocumentId)
            return Result.Failure(GeoErrors.RelationNotFound);

        try
        {
            relation.Close(_timeProvider.GetUtcNow());
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await PublishRelationsChangedAsync(command.DocumentId, cancellationToken);

            return Result.Success();
        }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(GeoErrors.Conflict(exception.Message));
        }
    }
}

/// <summary>
/// GeoJSON geometrisinden sınırlayıcı kutu çıkarır. Kesin uzamsal işlemler
/// PostGIS gerektirir; burada yalnız koordinatlar taranır.
/// </summary>
