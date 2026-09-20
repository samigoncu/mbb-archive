using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Organization.Application.Units;

namespace Mbb.Archive.Modules.Organization.Presentation;

public static class OrganizationEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/organization")
            .WithTags("Organization")
            .RequireAuthorization();

        group.MapGet("/units", GetTree)
            .RequireAuthorization("permission:organization.read");

        group.MapGet("/units/{id:guid}/members", GetMembers)
            .RequireAuthorization("permission:organization.read");

        group.MapGet("/subjects/{subjectId}/memberships", GetSubjectMemberships)
            .RequireAuthorization("permission:organization.read");

        group.MapPost("/units", CreateUnit)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.organization-unit-created.v1", "organization-unit");

        group.MapPut("/units/{id:guid}", RenameUnit)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.organization-unit-changed.v1", "organization-unit", "id");

        group.MapPost("/units/{id:guid}/move", MoveUnit)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.organization-unit-moved.v1", "organization-unit", "id");

        group.MapPost("/units/{id:guid}/type", SetUnitType)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.unit-type-assigned.v1", "organization");

        group.MapPost("/units/{id:guid}/active", SetActive)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.organization-unit-changed.v1", "organization-unit", "id");

        // Üyelik değişikliği yetki değişikliğidir; §13 gereği denetime yazılır.
        group.MapPost("/memberships", AssignMembership)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.permission-changed.v1", "subject");

        group.MapDelete("/subjects/{subjectId}/memberships/{unitId:guid}", RemoveMembership)
            .RequireAuthorization("permission:organization.manage")
            .WithAccessAudit("access.permission-changed.v1", "subject", "subjectId");

        endpoints.MapDirectoryEndpoints();
        endpoints.MapUnitAdministrationEndpoints();
        return endpoints;
    }

    private static async Task<IResult> GetTree(
        bool? includeInactive,
        OrganizationQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetUnitTreeQuery(includeInactive ?? false), ct));

    private static async Task<IResult> GetMembers(
        Guid id,
        OrganizationQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetUnitMembersQuery(id), ct));

    private static async Task<IResult> GetSubjectMemberships(
        string subjectId,
        OrganizationQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetSubjectMembershipsQuery(subjectId), ct));

    private static async Task<IResult> CreateUnit(
        CreateUnitRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new CreateUnitCommand(
                request.Code,
                request.Name,
                request.ShortName,
                request.ParentId,
                request.ExternalReference,
                request.TypeCode),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created($"/api/v1/organization/units/{result.Value}", new { id = result.Value });
    }

    private static async Task<IResult> RenameUnit(
        Guid id,
        RenameUnitRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new RenameUnitCommand(id, request.Name, request.ShortName), ct));

    private static async Task<IResult> MoveUnit(
        Guid id,
        MoveUnitRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new MoveUnitCommand(id, request.NewParentId), ct));

    private static async Task<IResult> SetUnitType(
        Guid id,
        SetUnitTypeRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new SetUnitTypeCommand(id, request.TypeCode), ct));

    private static async Task<IResult> SetActive(
        Guid id,
        SetActiveRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new SetUnitActiveCommand(id, request.IsActive), ct));

    private static async Task<IResult> AssignMembership(
        AssignMembershipRequest request,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new AssignMembershipCommand(request.SubjectId, request.UnitId, request.IsPrimary),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Ok(new { id = result.Value });
    }

    private static async Task<IResult> RemoveMembership(
        string subjectId,
        Guid unitId,
        OrganizationCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new RemoveMembershipCommand(subjectId, unitId), ct));

    private static IResult Ok<T>(Result<T> result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);

    private static IResult NoContent(Result result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();

    private sealed record CreateUnitRequest(
        string Code,
        string Name,
        string? ShortName,
        Guid? ParentId,
        string? ExternalReference,
        string? TypeCode);

    private sealed record RenameUnitRequest(string Name, string? ShortName);
    private sealed record MoveUnitRequest(Guid? NewParentId);
    private sealed record SetActiveRequest(bool IsActive);
    private sealed record SetUnitTypeRequest(string? TypeCode);
    private sealed record AssignMembershipRequest(string SubjectId, Guid UnitId, bool IsPrimary);
}
