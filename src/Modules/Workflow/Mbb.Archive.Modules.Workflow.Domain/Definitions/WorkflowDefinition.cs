using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Workflow.Domain.Definitions;

public enum WorkflowNodeType
{
    StartEvent = 0,
    UserTask = 1,
    ServiceTask = 2,
    TimerCatchEvent = 3,
    ExclusiveGateway = 4,
    EndEvent = 5
}

public sealed class WorkflowDefinition : AggregateRoot<Guid>
{
    private readonly List<WorkflowNode> _nodes = [];
    private readonly List<WorkflowTransition> _transitions = [];

    private WorkflowDefinition() { }

    private WorkflowDefinition(
        Guid id,
        string key,
        string name,
        int version) : base(id)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new DomainRuleViolationException("Workflow key is required.");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Workflow name is required.");
        if (version <= 0)
            throw new DomainRuleViolationException("Workflow version must be positive.");

        Key = key.Trim().ToLowerInvariant();
        Name = name.Trim();
        Version = version;
    }

    public string Key { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public int Version { get; private set; }
    public bool IsPublished { get; private set; }

    public IReadOnlyCollection<WorkflowNode> Nodes => _nodes.AsReadOnly();
    public IReadOnlyCollection<WorkflowTransition> Transitions => _transitions.AsReadOnly();

    public static WorkflowDefinition Create(
        string key,
        string name,
        int version)
        => new(Guid.CreateVersion7(), key, name, version);

    public WorkflowNode AddNode(
        WorkflowNodeType type,
        string name,
        string? permission,
        int? slaMinutes,
        int? timerDelayMinutes,
        string? serviceOperation)
    {
        EnsureDraft();

        if (type == WorkflowNodeType.UserTask && string.IsNullOrWhiteSpace(permission))
            throw new DomainRuleViolationException("User Task requires a permission.");
        if (slaMinutes is <= 0)
            throw new DomainRuleViolationException("SLA minutes must be positive.");
        if (type == WorkflowNodeType.TimerCatchEvent && timerDelayMinutes is not > 0)
            throw new DomainRuleViolationException("Timer event requires a positive delay.");
        if (type == WorkflowNodeType.ServiceTask && string.IsNullOrWhiteSpace(serviceOperation))
            throw new DomainRuleViolationException("Service Task requires an operation.");

        var node = new WorkflowNode(
            Guid.CreateVersion7(),
            Id,
            type,
            name,
            permission,
            slaMinutes,
            timerDelayMinutes,
            serviceOperation);

        _nodes.Add(node);
        return node;
    }

    public WorkflowTransition AddTransition(
        Guid fromNodeId,
        Guid toNodeId,
        string? conditionExpression,
        bool isDefault)
    {
        EnsureDraft();

        if (_nodes.All(x => x.Id != fromNodeId))
            throw new DomainRuleViolationException("Source node does not exist.");
        if (_nodes.All(x => x.Id != toNodeId))
            throw new DomainRuleViolationException("Target node does not exist.");
        if (fromNodeId == toNodeId)
            throw new DomainRuleViolationException("Self transition is not supported.");

        var transition = new WorkflowTransition(
            Guid.CreateVersion7(),
            Id,
            fromNodeId,
            toNodeId,
            string.IsNullOrWhiteSpace(conditionExpression)
                ? null
                : conditionExpression.Trim(),
            isDefault);

        _transitions.Add(transition);
        return transition;
    }

    public void Publish()
    {
        EnsureDraft();

        var starts = _nodes.Where(x => x.Type == WorkflowNodeType.StartEvent).ToArray();

        if (starts.Length != 1)
            throw new DomainRuleViolationException("Workflow must contain exactly one Start Event.");
        if (_nodes.All(x => x.Type != WorkflowNodeType.EndEvent))
            throw new DomainRuleViolationException("Workflow must contain at least one End Event.");
        if (_transitions.All(x => x.FromNodeId != starts[0].Id))
            throw new DomainRuleViolationException("Start Event must have an outgoing transition.");

        foreach (var gateway in _nodes.Where(x => x.Type == WorkflowNodeType.ExclusiveGateway))
        {
            var outgoing = _transitions.Where(x => x.FromNodeId == gateway.Id).ToArray();

            if (outgoing.Length < 2)
                throw new DomainRuleViolationException("Exclusive Gateway requires two or more outgoing transitions.");
            if (outgoing.Count(x => x.IsDefault) > 1)
                throw new DomainRuleViolationException("Exclusive Gateway can have one default transition.");
        }

        IsPublished = true;
    }

    public WorkflowNode GetStartNode()
        => _nodes.Single(x => x.Type == WorkflowNodeType.StartEvent);

    public WorkflowNode GetNode(Guid id)
        => _nodes.Single(x => x.Id == id);

    public IReadOnlyList<WorkflowTransition> GetOutgoing(Guid nodeId)
        => _transitions.Where(x => x.FromNodeId == nodeId).ToList();

    private void EnsureDraft()
    {
        if (IsPublished)
            throw new DomainRuleViolationException("Published workflow definition is immutable.");
    }
}

public sealed class WorkflowNode : Entity<Guid>
{
    private WorkflowNode() { }

    internal WorkflowNode(
        Guid id,
        Guid definitionId,
        WorkflowNodeType type,
        string name,
        string? permission,
        int? slaMinutes,
        int? timerDelayMinutes,
        string? serviceOperation) : base(id)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Workflow node name is required.");

        DefinitionId = definitionId;
        Type = type;
        Name = name.Trim();
        Permission = string.IsNullOrWhiteSpace(permission) ? null : permission.Trim().ToLowerInvariant();
        SlaMinutes = slaMinutes;
        TimerDelayMinutes = timerDelayMinutes;
        ServiceOperation = string.IsNullOrWhiteSpace(serviceOperation) ? null : serviceOperation.Trim();
    }

    public Guid DefinitionId { get; private set; }
    public WorkflowNodeType Type { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Permission { get; private set; }
    public int? SlaMinutes { get; private set; }
    public int? TimerDelayMinutes { get; private set; }
    public string? ServiceOperation { get; private set; }
}

public sealed class WorkflowTransition : Entity<Guid>
{
    private WorkflowTransition() { }

    internal WorkflowTransition(
        Guid id,
        Guid definitionId,
        Guid fromNodeId,
        Guid toNodeId,
        string? conditionExpression,
        bool isDefault) : base(id)
    {
        DefinitionId = definitionId;
        FromNodeId = fromNodeId;
        ToNodeId = toNodeId;
        ConditionExpression = conditionExpression;
        IsDefault = isDefault;
    }

    public Guid DefinitionId { get; private set; }
    public Guid FromNodeId { get; private set; }
    public Guid ToNodeId { get; private set; }
    public string? ConditionExpression { get; private set; }
    public bool IsDefault { get; private set; }
}
