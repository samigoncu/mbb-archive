using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Workflow.Application;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;

namespace Mbb.Archive.Modules.Workflow.Presentation;

public static class WorkflowEndpoints
{
    public static IEndpointRouteBuilder MapWorkflowEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/workflows")
            .WithTags("Workflow")
            .RequireAuthorization();

        group.MapPost("/definitions", CreateDefinition)
            .RequireAuthorization("permission:workflow.manage");

        group.MapPost("/definitions/{id:guid}/nodes", AddNode)
            .RequireAuthorization("permission:workflow.manage");

        group.MapPost("/definitions/{id:guid}/transitions", AddTransition)
            .RequireAuthorization("permission:workflow.manage");

        group.MapPost("/definitions/{id:guid}/publish", Publish)
            .RequireAuthorization("permission:workflow.manage");

        group.MapPost("/instances", Start)
            .RequireAuthorization("permission:workflow.start");

        group.MapPost("/instances/{id:guid}/complete-task", CompleteTask)
            .RequireAuthorization("permission:workflow.task.complete");

        group.MapPost("/instances/{id:guid}/complete-service-task", CompleteService)
            .RequireAuthorization("permission:workflow.service.complete");

        return endpoints;
    }

    private static async Task<IResult> CreateDefinition(
        CreateWorkflowCommand command,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => Created(await handler.Handle(command, ct), "/api/v1/workflows/definitions");

    private static async Task<IResult> AddNode(
        Guid id,
        NodeRequest request,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => Created(
            await handler.Handle(
                new AddWorkflowNodeCommand(
                    id,
                    request.Type,
                    request.Name,
                    request.Permission,
                    request.SlaMinutes,
                    request.TimerDelayMinutes,
                    request.ServiceOperation),
                ct),
            $"/api/v1/workflows/definitions/{id}/nodes");

    private static async Task<IResult> AddTransition(
        Guid id,
        TransitionRequest request,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => Created(
            await handler.Handle(
                new AddWorkflowTransitionCommand(
                    id,
                    request.FromNodeId,
                    request.ToNodeId,
                    request.ConditionExpression,
                    request.IsDefault),
                ct),
            $"/api/v1/workflows/definitions/{id}/transitions");

    private static async Task<IResult> Publish(
        Guid id,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new PublishWorkflowCommand(id), ct));

    private static async Task<IResult> Start(
        StartRequest request,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => Created(
            await handler.Handle(
                new StartWorkflowCommand(
                    request.DefinitionId,
                    request.DocumentId,
                    request.Variables ?? new Dictionary<string, string>()),
                ct),
            "/api/v1/workflows/instances");

    private static async Task<IResult> CompleteTask(
        Guid id,
        CompleteTaskRequest request,
        ClaimsPrincipal user,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
    {
        var subject =
            user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? "unknown";

        return NoContent(
            await handler.Handle(
                new CompleteWorkflowTaskCommand(
                    id,
                    subject,
                    request.Outcome,
                    request.Variables ?? new Dictionary<string, string>()),
                ct));
    }

    private static async Task<IResult> CompleteService(
        Guid id,
        CompleteServiceRequest request,
        WorkflowCommandHandlers handler,
        CancellationToken ct)
        => NoContent(
            await handler.Handle(
                new CompleteWorkflowServiceTaskCommand(
                    id,
                    request.Variables ?? new Dictionary<string, string>()),
                ct));

    private static IResult Created(Result<Guid> result, string basePath)
        => result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created($"{basePath}/{result.Value}", new { id = result.Value });

    private static IResult NoContent(Result result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();

    private sealed record NodeRequest(
        WorkflowNodeType Type,
        string Name,
        string? Permission,
        int? SlaMinutes,
        int? TimerDelayMinutes,
        string? ServiceOperation);

    private sealed record TransitionRequest(
        Guid FromNodeId,
        Guid ToNodeId,
        string? ConditionExpression,
        bool IsDefault);

    private sealed record StartRequest(
        Guid DefinitionId,
        Guid DocumentId,
        IReadOnlyDictionary<string, string>? Variables);

    private sealed record CompleteTaskRequest(
        string Outcome,
        IReadOnlyDictionary<string, string>? Variables);

    private sealed record CompleteServiceRequest(
        IReadOnlyDictionary<string, string>? Variables);
}
