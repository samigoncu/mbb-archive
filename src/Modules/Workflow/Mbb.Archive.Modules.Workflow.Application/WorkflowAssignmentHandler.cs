using Mbb.Archive.Modules.Workflow.Contracts.IntegrationEvents;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.Application;

public sealed record WorkflowAssignee(string SubjectId, string UnitName);
public interface IWorkflowAssignmentDirectory
{
    Task<IReadOnlyList<WorkflowAssignee>> GetCandidatesAsync(Guid documentId, CancellationToken ct, string? permission = null);
}
public sealed record AssignWorkflowTaskRequest(Guid WorkItemId, string SubjectId, long ExpectedVersion);
public sealed record CreateAssignedWorkflowTaskRequest(Guid DocumentId, string Title, string SubjectId, int SlaMinutes);

public sealed class WorkflowAssignmentHandler(IWorkflowRepository repository, IUnitOfWork<WorkflowBoundary> uow,
    IWorkflowAssignmentDirectory directory, ICurrentUserPermissions user, WorkflowRuntime runtime, TimeProvider time, IOutbox<WorkflowBoundary> outbox)
{
    public async Task<Result> AssignAsync(Guid instanceId, AssignWorkflowTaskRequest request, CancellationToken ct)
    {
        var instance = await repository.GetInstanceAsync(instanceId, ct);
        if (instance is null) return Result.Failure(Error.NotFound("workflow.missing", "Görev bulunamadı."));
        var candidates = await directory.GetCandidatesAsync(instance.DocumentId, ct, instance.WorkItems.FirstOrDefault(item => item.Id == request.WorkItemId)?.Permission);
        if (!candidates.Any(candidate => candidate.SubjectId == request.SubjectId))
            return Result.Failure(Error.Validation("workflow.assignee_invalid", "Belgenin biriminden görev yetkisi olan bir personel seçin."));
        try
        {
            var previous = instance.WorkItems.FirstOrDefault(item => item.Id == request.WorkItemId)?.AssigneeSubjectId;
            instance.AssignTask(request.WorkItemId, request.SubjectId, user.Subject, request.ExpectedVersion, time.GetUtcNow());
            outbox.Enqueue(new WorkflowTaskAssignedIntegrationEvent(Guid.CreateVersion7(), instance.Id, request.WorkItemId, instance.DocumentId, previous, request.SubjectId, user.Subject, time.GetUtcNow()));
            await uow.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("workflow.assignment_conflict", ex.Message)); }
    }
    public async Task<Result<Guid>> CreateAsync(CreateAssignedWorkflowTaskRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 300 || request.SlaMinutes < 1 || request.SlaMinutes > 525600)
            return Result<Guid>.Failure(Error.Validation("workflow.task_invalid", "Başlık ve 1–525600 dakika arası süre girin."));
        var candidates = await directory.GetCandidatesAsync(request.DocumentId, ct);
        if (!candidates.Any(candidate => candidate.SubjectId == request.SubjectId))
            return Result<Guid>.Failure(Error.Validation("workflow.assignee_invalid", "Belgenin biriminden görev yetkisi olan bir personel seçin."));
        var definition = WorkflowDefinition.Create($"assigned-{Guid.NewGuid():N}", request.Title.Trim(), 1);
        var start = definition.AddNode(WorkflowNodeType.StartEvent, "Başlangıç", null, null, null, null);
        var task = definition.AddNode(WorkflowNodeType.UserTask, request.Title.Trim(), "workflow.task.complete", request.SlaMinutes, null, null);
        var end = definition.AddNode(WorkflowNodeType.EndEvent, "Tamamlandı", null, null, null, null);
        definition.AddTransition(start.Id, task.Id, null, true);
        definition.AddTransition(task.Id, end.Id, null, true);
        definition.Publish();
        var now = time.GetUtcNow();
        var instance = WorkflowInstance.Start(definition.Id, request.DocumentId, start.Id, now);
        runtime.Start(definition, instance, now);
        instance.AssignTask(instance.WorkItems.Single().Id, request.SubjectId, user.Subject, instance.ConcurrencyVersion, now);
        outbox.Enqueue(new WorkflowTaskAssignedIntegrationEvent(Guid.CreateVersion7(), instance.Id, instance.WorkItems.Single().Id, instance.DocumentId, null, request.SubjectId, user.Subject, now));
        await repository.AddDefinitionAsync(definition, ct);
        await repository.AddInstanceAsync(instance, ct);
        await uow.SaveChangesAsync(ct);
        return Result<Guid>.Success(instance.Id);
    }
}
