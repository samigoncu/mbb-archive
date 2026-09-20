using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Workflow.Contracts.IntegrationEvents;

public sealed record WorkflowServiceTaskRequestedIntegrationEvent(
    Guid EventId,
    Guid InstanceId,
    Guid NodeId,
    Guid DocumentId,
    string Operation,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "workflow.service-task-requested.v1";
}

public sealed record WorkflowTaskEscalatedIntegrationEvent(
    Guid EventId,
    Guid InstanceId,
    Guid WorkItemId,
    Guid DocumentId,
    string Permission,
    int EscalationLevel,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "workflow.task-escalated.v1";
}

public sealed record WorkflowTaskAssignedIntegrationEvent(Guid EventId, Guid InstanceId, Guid WorkItemId,
    Guid DocumentId, string? PreviousAssignee, string AssigneeSubjectId, string AssignedBy,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "workflow.task-assigned.v1";
}
