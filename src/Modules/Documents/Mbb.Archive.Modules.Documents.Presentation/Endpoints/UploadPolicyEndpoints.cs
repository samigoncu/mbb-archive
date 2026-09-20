using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Settings;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;
internal static class UploadPolicyEndpoints
{
    internal static void MapUploadPolicy(this RouteGroupBuilder group)
    {
        group.MapGet("/upload-policy", async (UploadPolicyHandler handler, CancellationToken ct) =>
            Results.Ok(await handler.GetAsync(ct))).RequireAuthorization();
        group.MapPut("/upload-policy", async (UpdateUploadPolicy request, UploadPolicyHandler handler, CancellationToken ct) =>
        {
            var result = await handler.UpdateAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:access.admin");

        // Salt okunur: depolama yeri bir dağıtım kararıdır, buradan değişmez.
        group.MapGet("/storage", async (IStorageStatusQuery query, CancellationToken ct) =>
            Results.Ok(await query.GetAsync(ct))).RequireAuthorization("permission:operations.read");
    }
}
