using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Operations.Application.Commands;
using Mbb.Archive.Modules.Operations.Application.Queries;
using Mbb.Archive.Modules.Operations.Application.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Alerts;

namespace Mbb.Archive.Modules.Operations.Presentation;

public static class OperationsEndpoints
{
    public static IEndpointRouteBuilder MapOperationsEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/operations")
            .WithTags("Operations")
            .RequireAuthorization("permission:operations.read");

        group.MapGet(
            "/overview",
            async (
                OperationsQueryHandlers handler,
                CancellationToken cancellationToken) =>
            {
                var result = await handler.Handle(
                    new GetOperationsOverviewQuery(),
                    cancellationToken);

                return Results.Ok(result.Value);
            });

        group.MapGet(
            "/report/daily",
            async (
                OperationsQueryHandlers handler,
                CancellationToken cancellationToken) =>
            {
                var result = await handler.Handle(
                    new GetDailyOperationsReportQuery(),
                    cancellationToken);

                return Results.Ok(result.Value);
            }).RequireAuthorization("permission:operations.reports.read");

        group.MapGet("/alert-rules", async (AlertQueryHandlers handler, CancellationToken ct)
            => Results.Ok(await handler.Rules(ct)))
            .RequireAuthorization("permission:operations.read");

        group.MapPost("/alert-rules", async (CreateAlertRuleRequest request, AlertCommandHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new CreateAlertRuleCommand(request.Code, request.Metric, request.Comparison,
                request.Threshold, request.Severity, request.EvaluationWindowMinutes), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/operations/alert-rules/{result.Value}", new { id = result.Value });
        }).RequireAuthorization("permission:operations.alerts.manage");

        group.MapGet("/alerts", async (int? take, AlertQueryHandlers handler, CancellationToken ct)
            => Results.Ok(await handler.Active(take ?? 50, ct)))
            .RequireAuthorization("permission:operations.read");

        group.MapPost("/alerts/{id:guid}/acknowledge", async (Guid id, AcknowledgeAlertRequest request,
            ClaimsPrincipal user, AlertCommandHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new AcknowledgeAlertCommand(id, GetSubject(user), request.Note), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:operations.alerts.acknowledge");

        group.MapPost("/alerts/{id:guid}/resolve", async (Guid id, AlertCommandHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new ResolveAlertCommand(id), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:operations.alerts.manage");

        group.MapGet(
            "/verifications",
            async (
                int? take,
                OperationsQueryHandlers handler,
                CancellationToken cancellationToken) =>
            {
                var result = await handler.Handle(
                    new GetVerificationRunsQuery(take ?? 50),
                    cancellationToken);

                return Results.Ok(result.Value);
            });

        group.MapPost(
                "/verifications/integrity",
                async (
                    ClaimsPrincipal user,
                    OperationsCommandHandlers handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new RunIntegrityVerificationCommand(
                            GetSubject(user)),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Accepted(
                            $"/api/v1/operations/verifications/{result.Value}",
                            new { id = result.Value });
                })
            .RequireAuthorization("permission:operations.verify");

        group.MapGet(
            "/recovery-drills",
            async (
                int? take,
                OperationsQueryHandlers handler,
                CancellationToken cancellationToken) =>
            {
                var result = await handler.Handle(
                    new GetRecoveryDrillsQuery(take ?? 50),
                    cancellationToken);

                return Results.Ok(result.Value);
            });

        group.MapPost(
                "/recovery-drills",
                async (
                    PlanRecoveryDrillRequest request,
                    ClaimsPrincipal user,
                    OperationsCommandHandlers handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new PlanRecoveryDrillCommand(
                            request.BackupReference,
                            request.TargetEnvironment,
                            request.TargetRpoMinutes,
                            request.TargetRtoMinutes,
                            GetSubject(user)),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Created(
                            $"/api/v1/operations/recovery-drills/{result.Value}",
                            new { id = result.Value });
                })
            .RequireAuthorization("permission:operations.dr.manage");

        group.MapPost(
                "/recovery-drills/{id:guid}/start",
                async (
                    Guid id,
                    OperationsCommandHandlers handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new StartRecoveryDrillCommand(id),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.NoContent();
                })
            .RequireAuthorization("permission:operations.dr.manage");

        group.MapPost(
                "/recovery-drills/{id:guid}/complete",
                async (
                    Guid id,
                    CompleteRecoveryDrillRequest request,
                    OperationsCommandHandlers handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new CompleteRecoveryDrillCommand(
                            id,
                            request.Passed,
                            request.ActualRpoMinutes,
                            request.ActualRtoMinutes,
                            request.EvidenceReference,
                            request.Notes),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.NoContent();
                })
            .RequireAuthorization("permission:operations.dr.manage");

        return endpoints;
    }

    private static string GetSubject(ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? user.FindFirstValue("sub")
           ?? "unknown";

    private sealed record PlanRecoveryDrillRequest(
        string BackupReference,
        string TargetEnvironment,
        int TargetRpoMinutes,
        int TargetRtoMinutes);

    private sealed record CompleteRecoveryDrillRequest(
        bool Passed,
        int ActualRpoMinutes,
        int ActualRtoMinutes,
        string EvidenceReference,
        string Notes);
    private sealed record CreateAlertRuleRequest(string Code, string Metric, AlertComparison Comparison,
        decimal Threshold, AlertSeverity Severity, int EvaluationWindowMinutes);
    private sealed record AcknowledgeAlertRequest(string Note);
}
