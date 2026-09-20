using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Organization.Application.Units;
namespace Mbb.Archive.Modules.Organization.Presentation;

internal static class UnitAdministrationEndpoints
{
    public static void MapUnitAdministrationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/organization").WithTags("Organization").RequireAuthorization();
        // Teşkilat seviyeleri kataloğu. Okuma yetkisi geniştir; birim ekleme
        // ekranı seviyeleri listelemek zorunda.
        group.MapGet("/unit-types", async (UnitTypeHandlers handler, CancellationToken ct)
            => Results.Ok(await handler.ListAsync(ct)))
            .RequireAuthorization("permission:organization.read");

        group.MapPost("/unit-types/{code}", async (string code, SaveUnitType request,
            UnitTypeHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.CreateAsync(code, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:organization.manage")
          .WithAccessAudit("access.unit-type-created.v1", "organization");

        group.MapPut("/unit-types/{code}", async (string code, SaveUnitType request,
            UnitTypeHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.UpdateAsync(code, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:organization.manage")
          .WithAccessAudit("access.unit-type-updated.v1", "organization");

        group.MapPost("/unit-types/{code}/active", async (string code, SetUnitTypeActiveRequest request,
            UnitTypeHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.SetActiveAsync(code, request.IsActive, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:organization.manage")
          .WithAccessAudit("access.unit-type-updated.v1", "organization");

        group.MapDelete("/unit-types/{code}", async (string code, UnitTypeHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.DeleteAsync(code, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:organization.manage")
          .WithAccessAudit("access.unit-type-deleted.v1", "organization");

        group.MapGet("/units/{id:guid}/file-plans", async (Guid id, UnitAdministrationHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.GetPlansAsync(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:organization.read");
        group.MapPut("/units/{id:guid}/file-plans", async (Guid id, SaveUnitPlansRequest request, UnitAdministrationHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.SavePlansAsync(id, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { revision = result.Value });
        }).RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.unit-file-plans-changed.v1", "organization-unit", "id");
        group.MapDelete("/units/{id:guid}", async (Guid id, UnitAdministrationHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.RemoveAsync(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.organization-unit-deleted.v1", "organization-unit", "id");
        // Archive screens need their own mappings without organization administration permission.
        group.MapGet("/file-plan-assignments", async (Guid? unitId, IArchiveUnitDirectory units, IUnitFilePlanPolicy policy, CancellationToken ct) =>
        {
            var visible = await units.GetVisibleAsync(ct);
            if (unitId is not null && !visible.Any(x => x.Id == unitId)) return Results.NotFound();
            var result = new List<UnitFilePlanEntry>();
            foreach (var unit in visible.Where(x => unitId is null || x.Id == unitId))
                result.AddRange(await policy.GetAssignedAsync(unit.Id, ct));
            return Results.Ok(result);
        });
    }

    private sealed record SetUnitTypeActiveRequest(bool IsActive);
}
