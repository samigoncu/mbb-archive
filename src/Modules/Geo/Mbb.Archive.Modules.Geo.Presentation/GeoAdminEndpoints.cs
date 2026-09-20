using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Application.Services;

namespace Mbb.Archive.Modules.Geo.Presentation;

public static class GeoAdminEndpoints
{
    private sealed record ActiveRequest(bool IsActive);

    public static IEndpointRouteBuilder MapGeoAdminEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/geo/admin")
            .WithTags("Geo administration")
            .RequireAuthorization("permission:geo.manage");

        group.MapGet("/", async (GeoAdminHandler handler, IGeoRuntimeConfiguration runtime, CancellationToken ct)
            => Results.Ok(await handler.GetAsync(ct)));

        group.MapPut("/basemap", async (SaveGeoBasemap request, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.SaveBasemapAsync(request, ct), runtime, ct));

        group.MapPost("/services", async (SaveGeoService request, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.CreateServiceAsync(request, ct), runtime, ct));

        group.MapPut("/services/{id:guid}", async (Guid id, SaveGeoService request, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.UpdateServiceAsync(id, request, ct), runtime, ct));

        group.MapPost("/services/{id:guid}/active", async (Guid id, ActiveRequest request, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.SetServiceActiveAsync(id, request.IsActive, ct), runtime, ct));

        group.MapDelete("/services/{id:guid}", async (Guid id, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.DeleteServiceAsync(id, ct), runtime, ct));

        group.MapPost("/services/{id:guid}/layers", async (Guid id, SaveGeoLayer request, GeoAdminHandler handler,
            IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.AddLayerAsync(id, request, ct), runtime, ct));

        group.MapPut("/services/{id:guid}/layers/{layerId:guid}", async (Guid id, Guid layerId, SaveGeoLayer request,
            GeoAdminHandler handler, IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.UpdateLayerAsync(id, layerId, request, ct), runtime, ct));

        group.MapDelete("/services/{id:guid}/layers/{layerId:guid}", async (Guid id, Guid layerId,
            GeoAdminHandler handler, IGeoRuntimeConfiguration runtime, CancellationToken ct) =>
            await Apply(handler.RemoveLayerAsync(id, layerId, ct), runtime, ct));

        // Sunucudaki yayınlanmış katmanları okur; hiçbir şey kaydetmez.
        group.MapPost("/services/{id:guid}/discover", async (Guid id, GeoAdminHandler handler, CancellationToken ct) =>
        {
            var result = await handler.DiscoverAsync(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        });

        return endpoints;
    }

    /// <summary>
    /// Yazma başarılıysa çalışma anındaki anlık görüntü hemen tazelenir; yönetici
    /// değişikliğin etkisini bir sonraki istekte görür.
    /// </summary>
    private static async Task<IResult> Apply(
        Task<Result<GeoConfiguration>> work,
        IGeoRuntimeConfiguration runtime,
        CancellationToken ct)
    {
        var result = await work;
        if (result.IsFailure) return ApiResults.Problem(result.Error);
        await runtime.RefreshAsync(ct);
        return Results.Ok(result.Value);
    }
}
