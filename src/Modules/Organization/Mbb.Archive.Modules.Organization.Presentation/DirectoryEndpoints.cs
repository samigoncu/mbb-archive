using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Presentation;

internal static class DirectoryEndpoints
{
    public static void MapDirectoryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/organization/directory").WithTags("Organization")
            .RequireAuthorization("permission:organization.manage");
        group.MapGet("/status", (IDirectoryAdministration service) => Results.Ok(service.Status));

        group.MapGet("/settings", async (DirectorySettingsHandlers handler, CancellationToken ct)
            => Results.Ok(await handler.GetAsync(ct)));

        group.MapPut("/settings", async (SaveDirectorySettings request, DirectorySettingsHandlers handler,
            IDirectoryRuntime runtime, CancellationToken ct) =>
        {
            var result = await handler.SaveAsync(request, ct);
            if (result.IsFailure) return ApiResults.Problem(result.Error);
            // Kaydeden yönetici değişikliğin etkisini bir sonraki istekte görmeli.
            await runtime.RefreshAsync(ct);
            return Results.Ok(result.Value);
        });

        group.MapPost("/test-connection", async (TestLdapConnectionRequest? request, DirectorySettingsHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.TestConnectionAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { message = result.Value });
        });
        group.MapGet("/history", async (IDirectoryAdministration service, CancellationToken ct) => Results.Ok(await service.HistoryAsync(ct)));
        group.MapPost("/sync-units", async (HttpContext http, IDirectoryAdministration service, CancellationToken ct) =>
        {
            var result = await service.SyncUnitsAsync(AccessAuditIdentity.Subject(http.User), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).WithAccessAudit("access.directory-units-synchronized.v1", "directory");
        group.MapPost("/sync-user", async (SyncUserRequest request, HttpContext http, IDirectoryAdministration service, CancellationToken ct) =>
        {
            var result = await service.SyncUserAsync(request.SubjectId, request.DirectoryUserName, AccessAuditIdentity.Subject(http.User), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).WithAccessAudit("access.directory-memberships-synchronized.v1", "directory");

        group.MapGet("/users", async (string? arama, int? limit, DirectoryUserHandlers handler, CancellationToken ct)
            => Results.Ok(await handler.SearchAsync(arama, limit ?? 500, ct)));

        group.MapPut("/users/{subjectId}", async (string subjectId, SaveDirectoryUser request,
            DirectoryUserHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.SaveAsync(subjectId, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).WithAccessAudit("access.directory-user-saved.v1", "directory");

        // Giriş kaydı yetki gerektirmez: kullanıcının kendi künyesini tazeler.
        // Özne jetondan okunur, gövdeden değil — istemci başkasının kaydına yazamaz.
        endpoints.MapPost("/api/v1/organization/directory/users/sign-in",
            async (DirectoryUserHandlers handler, CancellationToken ct) =>
            {
                var result = await handler.RecordSignInAsync(ct);
                return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
            })
            .WithTags("Organization")
            .RequireAuthorization()
            // Her çağrı dizine gider; kullanıcı başına dakikada 10 yeterli,
            // giriş başına bir kez çağrılıyor.
            .RequireRateLimiting("directory");
    }
    private sealed record SyncUserRequest(string SubjectId, string DirectoryUserName);
}
