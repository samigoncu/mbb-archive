using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;

namespace Mbb.Archive.Modules.Workflow.Application;

public sealed record CreateWorkflowCommand(
    string Key,
    string Name,
    int Version) : ICommand<Guid>;

public sealed record AddWorkflowNodeCommand(
    Guid DefinitionId,
    WorkflowNodeType Type,
    string Name,
    string? Permission,
    int? SlaMinutes,
    int? TimerDelayMinutes,
    string? ServiceOperation) : ICommand<Guid>;

public sealed record AddWorkflowTransitionCommand(
    Guid DefinitionId,
    Guid FromNodeId,
    Guid ToNodeId,
    string? ConditionExpression,
    bool IsDefault) : ICommand<Guid>;

public sealed record PublishWorkflowCommand(Guid DefinitionId) : ICommand;

public sealed record StartWorkflowCommand(
    Guid DefinitionId,
    Guid DocumentId,
    IReadOnlyDictionary<string, string> Variables) : ICommand<Guid>;

public sealed record CompleteWorkflowTaskCommand(
    Guid InstanceId,
    string CompletedBy,
    string Outcome,
    IReadOnlyDictionary<string, string> Variables) : ICommand;

public sealed record CompleteWorkflowServiceTaskCommand(
    Guid InstanceId,
    IReadOnlyDictionary<string, string> Variables) : ICommand;

public sealed record ResumeWorkflowTimerCommand(Guid InstanceId) : ICommand;

public sealed record EscalateWorkflowTaskCommand(Guid InstanceId) : ICommand;
