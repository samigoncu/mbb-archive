using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.AccessControl.Application.Grants;
using Mbb.Archive.Modules.AccessControl.Application.Roles;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;

namespace Mbb.Archive.Modules.AccessControl.Presentation;

public static class AccessEndpoints
{
    public static IEndpointRouteBuilder MapAccessEndpoints(this IEndpointRouteBuilder e)
    {
        var g = e
            .MapGroup("/api/v1/access")
            .WithTags("Access Control")
            .RequireAuthorization("permission:access.admin");

        g.MapGet("/permissions", () => Results.Ok(PermissionCatalog.Codes.Order()));
        g.MapGet("/administration/roles", async (IAccessAdministration admin, CancellationToken ct) => Results.Ok(await admin.RolesAsync(ct)));
        g.MapGet("/subjects", async (string? search, int? page, IAccessAdministration admin, CancellationToken ct) => Results.Ok(await admin.SubjectsAsync(search, Math.Clamp(page ?? 1, 1, 10000), ct)));
        // Kimlik listesi gövdede: yüzlerce kimlik sorgu dizesine sığmaz.
        g.MapPost("/subjects/search", async (SubjectSearch request, IAccessAdministration admin, CancellationToken ct)
            => Results.Ok(await admin.SubjectsAsync(request, ct)));
        g.MapGet("/subjects/{subjectId}/roles", async (string subjectId, IAccessAdministration admin, CancellationToken ct) => Results.Ok(await admin.SubjectAsync(subjectId, ct)));
        g.MapDelete("/roles/{id:guid}", async (Guid id, string expectedVersion, IAccessAdministration admin, CancellationToken ct) => {
            var result = await admin.DeleteRoleAsync(id, expectedVersion, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).WithAccessAudit("access.permission-changed.v1", "role", "id");
        g.MapPut("/roles/{id:guid}", async (Guid id, UpdateManagedRole request, IAccessAdministration admin, CancellationToken ct) => {
            var result = await admin.UpdateRoleAsync(id, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).WithAccessAudit("access.permission-changed.v1", "role", "id");
        g.MapPut("/subjects/{subjectId}/roles", async (string subjectId, UpdateSubjectRoles request, IAccessAdministration admin, CancellationToken ct) => {
            var result = await admin.UpdateSubjectAsync(subjectId, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).WithAccessAudit("access.role-assigned.v1", "subject", "subjectId");

        g.MapGet("/roles", async (int? page, IAccessRepository repository, CancellationToken ct) =>
            Results.Ok(await repository.GetRolesAsync((Math.Clamp(page ?? 1, 1, 10000) - 1) * 100, 100, ct)));

        g.MapPost(
                "/roles",
                async (
                    CreateRoleCommand c,
                    CreateRoleCommandHandler h,
                    CancellationToken ct) =>
                {
                    var r = await h.Handle(c, ct);

                    return r.IsFailure
                        ? ApiResults.Problem(r.Error)
                        : Results.Created(
                            $"/api/v1/access/roles/{r.Value}",
                            new { id = r.Value });
                })
            .WithAccessAudit("access.permission-changed.v1", "role");

        g.MapPost(
                "/roles/{id:guid}/permissions",
                async (
                    Guid id,
                    PermissionRequest req,
                    GrantPermissionCommandHandler h,
                    CancellationToken ct) =>
                {
                    var r = await h.Handle(
                        new GrantPermissionCommand(id, req.Permission),
                        ct);

                    return r.IsFailure
                        ? ApiResults.Problem(r.Error)
                        : Results.NoContent();
                })
            .WithAccessAudit("access.permission-changed.v1", "role", "id");

        g.MapPost(
                "/subjects/{subjectId}/roles/{roleId:guid}",
                async (
                    string subjectId,
                    Guid roleId,
                    AssignRoleCommandHandler h,
                    CancellationToken ct) =>
                {
                    var r = await h.Handle(
                        new AssignRoleCommand(subjectId, roleId),
                        ct);

                    return r.IsFailure
                        ? ApiResults.Problem(r.Error)
                        : Results.NoContent();
                })
            .WithAccessAudit("access.role-assigned.v1", "subject", "subjectId");

        // Paylaşım yönetimi ayrı bir grupta durur. Grup düzeyindeki
        // access.admin altında kalsaydı yalnız tam yönetici paylaşım
        // yapabilirdi; oysa rol yönetimi ile belge paylaşımı farklı
        // görevlerdir ve aynı kişide olmak zorunda değildir.
        var grants = e
            .MapGroup("/api/v1/access/grants")
            .WithTags("Access Control")
            .RequireAuthorization();

        grants.MapGet(
                "/",
                async (
                    string resourceType,
                    string resourceKey,
                    AccessGrantQueryHandlers h,
                    CancellationToken ct) =>
                {
                    var r = await h.Handle(new GetResourceGrantsQuery(resourceType, resourceKey), ct);

                    return r.IsFailure ? ApiResults.Problem(r.Error) : Results.Ok(r.Value);
                })
            .RequireAuthorization("permission:access.grants.read");

        grants.MapPost(
                "/",
                async (
                    GrantRequest req,
                    AccessGrantCommandHandlers h,
                    CancellationToken ct) =>
                {
                    var r = await h.Handle(
                        new CreateAccessGrantCommand(
                            req.ResourceType,
                            req.ResourceKey,
                            req.SubjectType,
                            req.SubjectKey,
                            req.Permission,
                            req.ValidFrom,
                            req.ValidTo,
                            req.Reason),
                        ct);

                    return r.IsFailure
                        ? ApiResults.Problem(r.Error)
                        : Results.Created($"/api/v1/access/grants/{r.Value}", new { id = r.Value });
                })
            .RequireAuthorization("permission:access.grants.manage")
            .WithAccessAudit("access.grant-created.v1", "grant");

        grants.MapDelete(
                "/{id:guid}",
                async (Guid id, AccessGrantCommandHandlers h, CancellationToken ct) =>
                {
                    var r = await h.Handle(new RevokeAccessGrantCommand(id), ct);

                    return r.IsFailure ? ApiResults.Problem(r.Error) : Results.NoContent();
                })
            .RequireAuthorization("permission:access.grants.manage")
            .WithAccessAudit("access.grant-revoked.v1", "grant", "id");

        return e;
    }

    private sealed record PermissionRequest(string Permission);

    private sealed record GrantRequest(
        string ResourceType,
        string ResourceKey,
        string SubjectType,
        string SubjectKey,
        string Permission,
        DateTimeOffset? ValidFrom,
        DateTimeOffset? ValidTo,
        string? Reason);
}
