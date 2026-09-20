using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;

namespace Mbb.Archive.Modules.Workflow.Domain.Instances;

public enum WorkflowInstanceStatus
{
    Active = 0,
    WaitingTimer = 1,
    WaitingExternal = 2,
    Completed = 3,
    Failed = 4
}

public enum WorkflowWorkItemStatus
{
    Open = 0,
    Completed = 1,
    Escalated = 2
}

public sealed class WorkflowInstance : AggregateRoot<Guid>
{
    private readonly List<WorkflowVariable> _variables = [];
    private readonly List<WorkflowWorkItem> _workItems = [];

    private WorkflowInstance() { }

    private WorkflowInstance(
        Guid id,
        Guid definitionId,
        Guid documentId,
        Guid currentNodeId,
        DateTimeOffset startedAt) : base(id)
    {
        DefinitionId = definitionId;
        DocumentId = documentId;
        CurrentNodeId = currentNodeId;
        StartedAt = startedAt;
        Status = WorkflowInstanceStatus.Active;
        ConcurrencyVersion = 1;
    }

    public Guid DefinitionId { get; private set; }
    public Guid DocumentId { get; private set; }
    public Guid CurrentNodeId { get; private set; }
    public WorkflowInstanceStatus Status { get; private set; }
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset? WakeAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public IReadOnlyCollection<WorkflowVariable> Variables => _variables.AsReadOnly();
    public IReadOnlyCollection<WorkflowWorkItem> WorkItems => _workItems.AsReadOnly();

    public static WorkflowInstance Start(
        Guid definitionId,
        Guid documentId,
        Guid startNodeId,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            definitionId,
            documentId,
            startNodeId,
            now);

    public void SetVariables(IReadOnlyDictionary<string, string> variables)
    {
        foreach (var pair in variables)
        {
            var key = pair.Key.Trim().ToLowerInvariant();
            if (key.Length == 0)
                continue;

            var existing = _variables.SingleOrDefault(x => x.Key == key);

            if (existing is null)
                _variables.Add(new WorkflowVariable(Guid.CreateVersion7(), Id, key, pair.Value ?? string.Empty));
            else
                existing.ChangeValue(pair.Value ?? string.Empty);
        }

        ConcurrencyVersion++;
    }

    public IReadOnlyDictionary<string, string> SnapshotVariables()
        => _variables.ToDictionary(x => x.Key, x => x.Value);

    public void EnterNode(WorkflowNode node, DateTimeOffset now)
    {
        CurrentNodeId = node.Id;
        WakeAt = null;

        switch (node.Type)
        {
            case WorkflowNodeType.UserTask:
                OpenUserTask(node, now);
                Status = WorkflowInstanceStatus.Active;
                break;
            case WorkflowNodeType.ServiceTask:
                Status = WorkflowInstanceStatus.WaitingExternal;
                break;
            case WorkflowNodeType.TimerCatchEvent:
                Status = WorkflowInstanceStatus.WaitingTimer;
                WakeAt = now.AddMinutes(node.TimerDelayMinutes!.Value);
                break;
            case WorkflowNodeType.EndEvent:
                Status = WorkflowInstanceStatus.Completed;
                CompletedAt = now;
                break;
            default:
                Status = WorkflowInstanceStatus.Active;
                break;
        }

        ConcurrencyVersion++;
    }

    public void AssignTask(Guid workItemId, string subject, string assignedBy, long expectedVersion, DateTimeOffset now)
    {
        if (ConcurrencyVersion != expectedVersion)
            throw new DomainRuleViolationException("Görev değişmiş. Listeyi yenileyin.");
        var item = _workItems.SingleOrDefault(x => x.Id == workItemId && x.NodeId == CurrentNodeId && x.Status != WorkflowWorkItemStatus.Completed)
            ?? throw new DomainRuleViolationException("Atanabilecek açık görev bulunamadı.");
        item.Assign(subject, assignedBy, now);
        ConcurrencyVersion++;
    }

    public void CompleteCurrentTask(
        string completedBy,
        string outcome,
        IReadOnlyDictionary<string, string> variables,
        DateTimeOffset now)
    {
        var workItem = _workItems
            .Where(x => x.NodeId == CurrentNodeId && x.Status != WorkflowWorkItemStatus.Completed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault()
            ?? throw new DomainRuleViolationException("Current node has no open user task.");

        workItem.Complete(completedBy, outcome, now);
        SetVariables(variables);
        SetVariables(new Dictionary<string,string> { ["outcome"] = outcome });
    }

    public void CompleteExternalTask(
        IReadOnlyDictionary<string, string> variables)
    {
        if (Status != WorkflowInstanceStatus.WaitingExternal)
            throw new DomainRuleViolationException("Workflow is not waiting for a service task.");

        SetVariables(variables);
        Status = WorkflowInstanceStatus.Active;
        ConcurrencyVersion++;
    }

    public void ResumeTimer(DateTimeOffset now)
    {
        if (Status != WorkflowInstanceStatus.WaitingTimer || WakeAt is null || now < WakeAt)
            throw new DomainRuleViolationException("Workflow timer is not due.");

        Status = WorkflowInstanceStatus.Active;
        WakeAt = null;
        ConcurrencyVersion++;
    }

    public WorkflowWorkItem EscalateCurrentTask(DateTimeOffset now)
    {
        var workItem = _workItems
            .Where(x => x.NodeId == CurrentNodeId && x.Status != WorkflowWorkItemStatus.Completed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault()
            ?? throw new DomainRuleViolationException("Current node has no open user task.");

        workItem.Escalate(now);
        ConcurrencyVersion++;
        return workItem;
    }

    private void OpenUserTask(WorkflowNode node, DateTimeOffset now)
    {
        if (_workItems.Any(x => x.NodeId == node.Id && x.Status != WorkflowWorkItemStatus.Completed))
            return;

        _workItems.Add(
            new WorkflowWorkItem(
                Guid.CreateVersion7(),
                Id,
                node.Id,
                node.Permission!,
                now,
                node.SlaMinutes is > 0 ? now.AddMinutes(node.SlaMinutes.Value) : null));
    }
}

public sealed class WorkflowVariable : Entity<Guid>
{
    private WorkflowVariable() { }

    internal WorkflowVariable(
        Guid id,
        Guid instanceId,
        string key,
        string value) : base(id)
    {
        InstanceId = instanceId;
        Key = key;
        Value = value;
    }

    public Guid InstanceId { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;

    internal void ChangeValue(string value) => Value = value;
}

public sealed class WorkflowWorkItem : Entity<Guid>
{
    private WorkflowWorkItem() { }

    internal WorkflowWorkItem(
        Guid id,
        Guid instanceId,
        Guid nodeId,
        string permission,
        DateTimeOffset createdAt,
        DateTimeOffset? dueAt) : base(id)
    {
        InstanceId = instanceId;
        NodeId = nodeId;
        Permission = permission;
        CreatedAt = createdAt;
        DueAt = dueAt;
        Status = WorkflowWorkItemStatus.Open;
    }

    public Guid InstanceId { get; private set; }
    public Guid NodeId { get; private set; }
    public string Permission { get; private set; } = string.Empty;
    public WorkflowWorkItemStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? DueAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? CompletedBy { get; private set; }
    public string? Outcome { get; private set; }
    public string? AssigneeSubjectId { get; private set; }
    public string? AssignedBy { get; private set; }
    public DateTimeOffset? AssignedAt { get; private set; }
    internal void Assign(string subject, string assignedBy, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 300)
            throw new DomainRuleViolationException("Geçerli personel seçin.");
        AssigneeSubjectId = subject.Trim(); AssignedBy = assignedBy; AssignedAt = now;
    }
    public int EscalationLevel { get; private set; }

    internal void Complete(
        string completedBy,
        string outcome,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(completedBy))
            throw new DomainRuleViolationException("Task completer is required.");

        Status = WorkflowWorkItemStatus.Completed;
        CompletedBy = completedBy.Trim();
        Outcome = string.IsNullOrWhiteSpace(outcome) ? "completed" : outcome.Trim();
        CompletedAt = now;
    }

    internal void Escalate(DateTimeOffset now)
    {
        if (Status == WorkflowWorkItemStatus.Completed)
            throw new DomainRuleViolationException("Completed task cannot be escalated.");

        Status = WorkflowWorkItemStatus.Escalated;
        EscalationLevel++;
    }
}
