using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Application.Entities;

namespace Mbb.Archive.Modules.Geo.Presentation;

public static class GeoEndpoints
{
    public static IEndpointRouteBuilder MapGeoEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/geo")
            .WithTags("Geo")
            .RequireAuthorization();

        group.MapGet("/settings", GetSettings)
            .RequireAuthorization("permission:geo.read");

        group.MapGet("/layers", GetLayers)
            .RequireAuthorization("permission:geo.read");

        // Haritada çizilecek WMS katmanları; parola ve adres dışarı sızmaz.
        group.MapGet("/wms/layers", (IGeoRuntimeConfiguration runtime) => Results.Ok(
            runtime.Current.Wms.SelectMany(service => service.Layers.Select(layer => new
            {
                serviceId = service.Id,
                serviceTitle = service.Title,
                layerId = layer.Id,
                layerName = layer.LayerName,
                title = layer.Title,
                visibleByDefault = layer.VisibleByDefault,
                opacityPercent = layer.OpacityPercent,
                imageFormat = layer.ImageFormat ?? "image/png",
                isQueryable = layer.IsQueryable,
            }))))
            .RequireAuthorization("permission:geo.read");

        group.MapGet("/wms/{serviceId:guid}", async (Guid serviceId, HttpRequest request,
            IGeoWmsProxy proxy, CancellationToken ct) =>
        {
            var parameters = request.Query.ToDictionary(
                pair => pair.Key, pair => pair.Value.ToString(), StringComparer.OrdinalIgnoreCase);
            var response = await proxy.SendAsync(serviceId, parameters, ct);
            return response.StatusCode is >= 200 and < 300
                ? Results.Bytes(response.Content, response.ContentType)
                : Results.StatusCode(response.StatusCode);
        }).RequireAuthorization("permission:geo.read");

        group.MapGet("/entities", SearchEntities)
            .RequireAuthorization("permission:geo.read");

        group.MapGet("/entities/{id:guid}", GetEntity)
            .RequireAuthorization("permission:geo.read");

        // §18: haritadan belgeye.
        group.MapGet("/entities/{id:guid}/documents", GetEntityDocuments)
            .RequireAuthorization("permission:geo.read");

        group.MapPost("/entities", ImportEntity)
            .RequireAuthorization("permission:geo.manage");

        group.MapGet("/features/search", SearchProviderFeatures)
            .RequireAuthorization("permission:geo.read");

        // §18: belgeden haritaya.
        group.MapGet("/documents/{documentId:guid}/relations", GetDocumentRelations)
            .RequireAuthorization("permission:geo.read");

        group.MapPost("/documents/{documentId:guid}/relations", CreateRelation)
            .RequireAuthorization("permission:geo.manage")
            .WithAccessAudit("access.geo-relation-created.v1", "document", "documentId");

        group.MapDelete("/documents/{documentId:guid}/relations/{relationId:guid}", CloseRelation)
            .RequireAuthorization("permission:geo.manage")
            .WithAccessAudit("access.geo-relation-closed.v1", "document", "documentId");

        group.MapPost("/features/import", async (ImportFeatureRequest request, ImportProviderFeatureHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(request.Layer, request.FeatureId, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new {id = result.Value});
        }).RequireAuthorization("permission:geo.manage")
          .WithAccessAudit("access.geo-feature-imported.v1", "geo-entity");

        group.MapPost("/entities/{id:guid}/active", async (Guid id, ActiveRequest request, SetGeoEntityActiveHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, request.IsActive, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:geo.manage")
          .WithAccessAudit("access.geo-entity-status-changed.v1", "geo-entity", "id");
        return endpoints;
    }

    /// <summary>
    /// Harita altlığı ve başlangıç görünümü. Altlık adresi yapılandırılmamışsa
    /// arayüz dış bir servise istek atmaz; geometriler nötr zemin üzerinde
    /// çizilir ve eksik yapılandırma açıkça bildirilir.
    /// </summary>
    private sealed record ImportFeatureRequest(string Layer, string FeatureId);
    private sealed record ActiveRequest(bool IsActive);

    private static IResult GetSettings(IGeoMapSettings settings)
        => Results.Ok(settings.Current);

    /// <summary>
    /// Yerel katalog her zaman vardır; sağlayıcı katmanları yalnızca
    /// yapılandırıldığında kullanılabilir olarak işaretlenir.
    /// </summary>
    private static IResult GetLayers(IGeoFeatureProvider provider)
        => Results.Ok(
            new[]
            {
                new GeoLayerDescriptor(
                    "local",
                    "local",
                    "Yerel katalog",
                    "CustomGeometry",
                    true)
            }
            .Concat(provider.Layers)
            .ToArray());

    private static async Task<IResult> SearchEntities(
        int? page,
        int? pageSize,
        string? search,
        string? entityType,
        string? bbox,
        GeoQueryHandlers handler,
        CancellationToken ct)
        => Ok(
            await handler.Handle(
                new SearchGeoEntitiesQuery(page ?? 1, pageSize ?? 50, search, entityType, bbox),
                ct));

    private static async Task<IResult> GetEntity(
        Guid id,
        GeoQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetGeoEntityQuery(id), ct));

    private static async Task<IResult> GetEntityDocuments(
        Guid id,
        bool? activeOnly,
        GeoQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetGeoEntityDocumentsQuery(id, activeOnly ?? false), ct));

    private static async Task<IResult> GetDocumentRelations(
        Guid documentId,
        GeoQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetDocumentGeoRelationsQuery(documentId), ct));

    private static async Task<IResult> ImportEntity(
        ImportRequest request,
        GeoCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new ImportGeoEntityCommand(
                string.IsNullOrWhiteSpace(request.Provider) ? "local" : request.Provider,
                string.IsNullOrWhiteSpace(request.LayerName) ? "local" : request.LayerName,
                string.IsNullOrWhiteSpace(request.FeatureId)
                    ? Guid.CreateVersion7().ToString("D")
                    : request.FeatureId,
                request.EntityType,
                request.Name,
                request.GeoJson,
                request.PropertiesJson,
                request.ExternalReference),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created($"/api/v1/geo/entities/{result.Value}", new { id = result.Value });
    }

    private static async Task<IResult> SearchProviderFeatures(
        string layer,
        string q,
        int? limit,
        IGeoFeatureProvider provider,
        CancellationToken ct)
    {
        var result = await provider.SearchAsync(layer, q, limit ?? 20, ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Ok(result.Value);
    }

    private static async Task<IResult> CreateRelation(
        Guid documentId,
        RelationRequest request,
        GeoCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new CreateGeoRelationCommand(
                documentId,
                request.GeoEntityId,
                request.RelationType,
                request.ValidFrom,
                request.ValidTo),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created(
                $"/api/v1/geo/documents/{documentId}/relations/{result.Value}",
                new { id = result.Value });
    }

    private static async Task<IResult> CloseRelation(
        Guid documentId,
        Guid relationId,
        GeoCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new CloseGeoRelationCommand(documentId, relationId),
            ct);

        return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
    }

    private static IResult Ok<T>(Result<T> result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);

    private sealed record ImportRequest(
        string? Provider,
        string? LayerName,
        string? FeatureId,
        string EntityType,
        string Name,
        string GeoJson,
        string? PropertiesJson,
        string? ExternalReference);

    private sealed record RelationRequest(
        Guid GeoEntityId,
        string RelationType,
        DateTimeOffset? ValidFrom,
        DateTimeOffset? ValidTo);
}
