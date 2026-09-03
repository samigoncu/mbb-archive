using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Workflow.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.Application;

public sealed class WorkflowRuntime
{
    private const int SafetyLimit = 100;

    private readonly WorkflowConditionEvaluator _conditions;
    private readonly IOutbox<WorkflowBoundary> _outbox;

    public WorkflowRuntime(
        WorkflowConditionEvaluator conditions,
        IOutbox<WorkflowBoundary> outbox)
    {
        _conditions = conditions;
        _outbox = outbox;
    }

    public void Start(
        WorkflowDefinition definition,
        WorkflowInstance instance,
        DateTimeOffset now)
    {
        instance.EnterNode(definition.GetStartNode(), now);
        AdvanceFromCurrent(definition, instance, now);
    }

    public void ContinueAfterWait(
        WorkflowDefinition definition,
        WorkflowInstance instance,
        DateTimeOffset now)
        => AdvanceFromCurrent(definition, instance, now);

    private void AdvanceFromCurrent(
        WorkflowDefinition definition,
        WorkflowInstance instance,
        DateTimeOffset now)
    {
        for (var i = 0; i < SafetyLimit; i++)
        {
            var current = definition.GetNode(instance.CurrentNodeId);

            if (current.Type is
                WorkflowNodeType.UserTask
                or WorkflowNodeType.TimerCatchEvent
                or WorkflowNodeType.EndEvent)
            {
                return;
            }

            if (current.Type == WorkflowNodeType.ServiceTask)
            {
                _outbox.Enqueue(
                    new WorkflowServiceTaskRequestedIntegrationEvent(
                        Guid.CreateVersion7(),
                        instance.Id,
                        current.Id,
                        instance.DocumentId,
                        current.ServiceOperation!,
                        now));
                return;
            }

            var outgoing = definition.GetOutgoing(current.Id);
            var variables = instance.SnapshotVariables();

            var selected = outgoing
                .Where(x => !x.IsDefault)
                .FirstOrDefault(x => _conditions.Evaluate(x.ConditionExpression, variables))
                ?? outgoing.SingleOrDefault(x => x.IsDefault)
                ?? outgoing.SingleOrDefault(x => x.ConditionExpression is null);

            if (selected is null)
                throw new DomainRuleViolationException(
                    $"No eligible transition from node '{current.Name}'.");

            instance.EnterNode(definition.GetNode(selected.ToNodeId), now);
        }

        throw new DomainRuleViolationException(
            "Workflow exceeded automatic transition safety limit.");
    }
}
