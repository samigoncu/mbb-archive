using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Application.Holds.Place;
using Mbb.Archive.Modules.Retention.Application.Holds.Release;
using Mbb.Archive.Modules.Retention.Application.Queries;
using Mbb.Archive.Modules.Retention.Application.Rules.Create;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Presentation;

public static class RetentionEndpoints
{
    public static IEndpointRouteBuilder MapRetentionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/retention").WithTags("Retention").RequireAuthorization();
        group.MapGet("/cases/{id:guid}", async (Guid id, RetentionQueryHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.GetCase(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:retention.read");
        group.MapGet("/cases", ListCases).RequireAuthorization("permission:retention.read");
        group.MapGet("/rules", async (RetentionQueryHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new GetRetentionRulesQuery(), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:retention.read");
        group.MapGet("/cases/{id:guid}/legal-holds", async (Guid id, RetentionQueryHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new GetLegalHoldsQuery(id), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:retention.read");
        group.MapPost("/rules", async (CreateRuleRequest request, CreateRetentionRuleCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new CreateRetentionRuleCommand(request.Code, request.Name, request.RetentionMonths, request.Action), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/retention/rules/{result.Value}", new { id = result.Value });
        }).RequireAuthorization("permission:retention.rules.manage");
        group.MapPost("/cases/{id:guid}/legal-holds", async (Guid id, PlaceHoldRequest request,
            ICurrentUserPermissions user, PlaceLegalHoldCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new PlaceLegalHoldCommand(id, request.Reason, user.Subject), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error)
                : Results.Created($"/api/v1/retention/cases/{id}/legal-holds/{result.Value}", new { id = result.Value });
        }).RequireAuthorization("permission:retention.holds.manage");
        group.MapPost("/cases/{id:guid}/legal-holds/{holdId:guid}/release", async (Guid id, Guid holdId,
            ReleaseHoldRequest request, ICurrentUserPermissions user, ReleaseLegalHoldCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new ReleaseLegalHoldCommand(id, holdId, user.Subject, request.Reason), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:retention.holds.manage");
        // Compatibility route cannot guess which hold to release if more than one is active.
        group.MapPost("/cases/{id:guid}/legal-holds/release", async (Guid id,
            ReleaseHoldRequest request, ICurrentUserPermissions user, ReleaseLegalHoldCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new ReleaseLegalHoldCommand(id, null, user.Subject, request.Reason), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:retention.holds.manage");
        endpoints.MapDispositionEndpoints();
        return endpoints;
    }

    private static async Task<IResult> ListCases(int? page, int? pageSize, string? status, string? action,
        bool? heldOnly, RetentionQueryHandlers handler, CancellationToken ct)
    {
        var result = await handler.Handle(new GetRetentionCasesQuery(page ?? 1, pageSize ?? PageRequest.DefaultPageSize,
            new RetentionCaseFilter(status, action, heldOnly ?? false)), ct);
        return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
    }
    private sealed record CreateRuleRequest(string Code, string Name, int RetentionMonths, DispositionAction Action);
    private sealed record PlaceHoldRequest(string Reason);
    private sealed record ReleaseHoldRequest(string Reason);
}
