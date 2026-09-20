using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Operations.Application.Automation;
namespace Mbb.Archive.Modules.Operations.Presentation;
internal static class OperationsAutomationEndpoints
{
    public static void MapOperationsAutomationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/operations").WithTags("Operations")
            .RequireAuthorization("permission:operations.read");
        group.MapGet("/automation/status", (IOperationsAutomation service) => Results.Ok(service.Status));
        group.MapGet("/automation/history", async (IOperationsAutomation service, CancellationToken ct) => Results.Ok(await service.HistoryAsync(ct)));
        group.MapPost("/alerts/evaluate", async (HttpContext http, IOperationsAutomation service, CancellationToken ct) =>
            Results.Ok(await service.EvaluateAsync(AccessAuditIdentity.Subject(http.User), ct)))
            .RequireAuthorization("permission:operations.alerts.manage").WithAccessAudit("access.operations-alerts-evaluated.v1", "operations");
        group.MapPost("/alert-rules/{id:guid}/enabled", async (Guid id, RuleEnabledRequest request, HttpContext http, IOperationsAutomation service, CancellationToken ct) =>
        {
            var result = await service.SetRuleEnabledAsync(id, request.Enabled, AccessAuditIdentity.Subject(http.User), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:operations.alerts.manage").WithAccessAudit("access.operations-rule-changed.v1", "alert-rule", "id");
        group.MapGet("/notifications", async (IOperationsAutomation service, CancellationToken ct) => Results.Ok(await service.DeliveriesAsync(ct)))
            .RequireAuthorization("permission:operations.alerts.manage");
        group.MapPost("/notifications/{id:guid}/retry", async (Guid id, HttpContext http, IOperationsAutomation service, CancellationToken ct) =>
        {
            var result = await service.RetryAsync(id, AccessAuditIdentity.Subject(http.User), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:operations.alerts.manage").WithAccessAudit("access.operations-notification-retried.v1", "notification", "id");
    }
    private sealed record RuleEnabledRequest(bool Enabled);
}
