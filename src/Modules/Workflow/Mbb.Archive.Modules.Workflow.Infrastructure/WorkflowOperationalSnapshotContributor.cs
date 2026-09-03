using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.Infrastructure;

internal sealed class WorkflowOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly WorkflowDbContext _db;
    private readonly TimeProvider _timeProvider;

    public WorkflowOperationalSnapshotContributor(
        WorkflowDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "workflow";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();

        var active = await _db.Instances.AsNoTracking().LongCountAsync(
            x => x.Status != WorkflowInstanceStatus.Completed
                 && x.Status != WorkflowInstanceStatus.Failed,
            cancellationToken);

        var dueTimers = await _db.Instances.AsNoTracking().LongCountAsync(
            x =>
                x.Status == WorkflowInstanceStatus.WaitingTimer
                && x.WakeAt != null
                && x.WakeAt <= now,
            cancellationToken);

        var overdueTasks = await _db.Instances.AsNoTracking()
            .SelectMany(x => x.WorkItems)
            .LongCountAsync(
                x =>
                    x.Status != WorkflowWorkItemStatus.Completed
                    && x.DueAt != null
                    && x.DueAt <= now,
                cancellationToken);

        var pendingOutbox = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            x => x.ProcessedAt == null,
            cancellationToken);

        var health = overdueTasks > 50
            ? OperationalHealth.Unhealthy
            : overdueTasks > 0 || dueTimers > 20 || pendingOutbox > 100
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            now,
            [
                new("instances_active", active),
                new("timers_due", dueTimers),
                new("tasks_overdue", overdueTasks),
                new("outbox_pending", pendingOutbox)
            ],
            overdueTasks > 0
                ? [new(OperationalHealth.Degraded, "workflow.sla_overdue", $"{overdueTasks} work items are overdue.")]
                : []);
    }
}
