using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Presentation;

public static class MalatyaApiEndpoints
{
    public static void MapMalatyaApiEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/organization/malatya-api")
            .WithTags("Organization")
            .RequireAuthorization("permission:organization.manage");

        group.MapGet("/settings", async (MalatyaApiSettingsHandlers handler, CancellationToken ct) =>
        {
            var settings = await handler.GetAsync(ct);
            return Results.Ok(settings);
        });

        group.MapPut("/settings", async (SaveMalatyaApiSettings request, MalatyaApiSettingsHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.SaveAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        });

        group.MapPost("/test-connection", async (TestConnectionRequest? request, MalatyaApiSettingsHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.TestConnectionAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        });

        group.MapPost("/switch-directory", async (SwitchDirectorySourceRequest request, MalatyaApiSettingsHandlers handler, IDirectoryRuntime runtime, CancellationToken ct) =>
        {
            var result = await handler.SwitchDirectorySourceAsync(request, ct);
            if (result.IsFailure) return ApiResults.Problem(result.Error);
            await runtime.RefreshAsync(ct);
            return Results.Ok(result.Value);
        });

        group.MapPost("/test-sms", async (TestSmsRequest request, MalatyaApiSettingsHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.TestSmsAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        });
    }
}

