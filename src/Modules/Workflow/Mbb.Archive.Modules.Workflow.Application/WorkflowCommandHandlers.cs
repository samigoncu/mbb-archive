using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.Application;

public interface IWorkflowRepository
{
    Task AddDefinitionAsync(WorkflowDefinition definition, CancellationToken cancellationToken);
    Task<WorkflowDefinition?> GetDefinitionAsync(Guid id, CancellationToken cancellationToken);
    Task AddInstanceAsync(WorkflowInstance instance, CancellationToken cancellationToken);
    Task<WorkflowInstance?> GetInstanceAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> GetDueTimerInstanceIdsAsync(
        DateTimeOffset now,
        int take,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> GetOverdueTaskInstanceIdsAsync(
        DateTimeOffset now,
        int take,
        CancellationToken cancellationToken);
}

public sealed class WorkflowCommandHandlers :
    ICommandHandler<CreateWorkflowCommand, Guid>,
    ICommandHandler<AddWorkflowNodeCommand, Guid>,
    ICommandHandler<AddWorkflowTransitionCommand, Guid>,
    ICommandHandler<PublishWorkflowCommand>,
    ICommandHandler<StartWorkflowCommand, Guid>,
    ICommandHandler<CompleteWorkflowTaskCommand>,
    ICommandHandler<CompleteWorkflowServiceTaskCommand>,
    ICommandHandler<ResumeWorkflowTimerCommand>,
    ICommandHandler<EscalateWorkflowTaskCommand>
{
    private readonly IWorkflowRepository _repository;
    private readonly IUnitOfWork<WorkflowBoundary> _unitOfWork;
    private readonly WorkflowRuntime _runtime;
    private readonly IOutbox<WorkflowBoundary> _outbox;
    private readonly TimeProvider _time;

    public WorkflowCommandHandlers(
        IWorkflowRepository repository,
        IUnitOfWork<WorkflowBoundary> unitOfWork,
        WorkflowRuntime runtime,
        IOutbox<WorkflowBoundary> outbox,
        TimeProvider time)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _runtime = runtime;
        _outbox = outbox;
        _time = time;
    }

    public async Task<Result<Guid>> Handle(
        CreateWorkflowCommand command,
        CancellationToken ct)
    {
        try
        {
            var definition = WorkflowDefinition.Create(
                command.Key,
                command.Name,
                command.Version);

            await _repository.AddDefinitionAsync(definition, ct);
            await _unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(definition.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result<Guid>> Handle(
        AddWorkflowNodeCommand command,
        CancellationToken ct)
    {
        var definition = await _repository.GetDefinitionAsync(command.DefinitionId, ct);

        if (definition is null)
            return Result<Guid>.Failure(NotFound("definition"));

        try
        {
            var node = definition.AddNode(
                command.Type,
                command.Name,
                command.Permission,
                command.SlaMinutes,
                command.TimerDelayMinutes,
                command.ServiceOperation);

            await _unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(node.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result<Guid>> Handle(
        AddWorkflowTransitionCommand command,
        CancellationToken ct)
    {
        var definition = await _repository.GetDefinitionAsync(command.DefinitionId, ct);

        if (definition is null)
            return Result<Guid>.Failure(NotFound("definition"));

        try
        {
            var transition = definition.AddTransition(
                command.FromNodeId,
                command.ToNodeId,
                command.ConditionExpression,
                command.IsDefault);

            await _unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(transition.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result> Handle(
        PublishWorkflowCommand command,
        CancellationToken ct)
    {
        var definition = await _repository.GetDefinitionAsync(command.DefinitionId, ct);

        if (definition is null)
            return Result.Failure(NotFound("definition"));

        try
        {
            definition.Publish();
            await _unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("workflow.publish_conflict", ex.Message));
        }
    }

    public async Task<Result<Guid>> Handle(
        StartWorkflowCommand command,
        CancellationToken ct)
    {
        var definition = await _repository.GetDefinitionAsync(command.DefinitionId, ct);

        if (definition is null || !definition.IsPublished)
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "workflow.not_published",
                    "Published workflow definition is required."));
        }

        try
        {
            var now = _time.GetUtcNow();

            var instance = WorkflowInstance.Start(
                definition.Id,
                command.DocumentId,
                definition.GetStartNode().Id,
                now);

            instance.SetVariables(command.Variables);

            await _repository.AddInstanceAsync(instance, ct);
            _runtime.Start(definition, instance, now);

            await _unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(instance.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Result<Guid>.Failure(Error.Conflict("workflow.start_conflict", ex.Message));
        }
    }

    public async Task<Result> Handle(
        CompleteWorkflowTaskCommand command,
        CancellationToken ct)
    {
        var state = await LoadAsync(command.InstanceId, ct);

        if (state is null)
            return Result.Failure(NotFound("instance"));

        try
        {
            var now = _time.GetUtcNow();

            state.Value.Instance.CompleteCurrentTask(
                command.CompletedBy,
                command.Outcome,
                command.Variables,
                now);

            _runtime.ContinueAfterWait(
                state.Value.Definition,
                state.Value.Instance,
                now);

            await _unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("workflow.task_conflict", ex.Message));
        }
    }

    public async Task<Result> Handle(
        CompleteWorkflowServiceTaskCommand command,
        CancellationToken ct)
    {
        var state = await LoadAsync(command.InstanceId, ct);

        if (state is null)
            return Result.Failure(NotFound("instance"));

        try
        {
            state.Value.Instance.CompleteExternalTask(command.Variables);

            _runtime.ContinueAfterWait(
                state.Value.Definition,
                state.Value.Instance,
                _time.GetUtcNow());

            await _unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("workflow.service_conflict", ex.Message));
        }
    }


    public async Task<Result> Handle(
        ResumeWorkflowTimerCommand command,
        CancellationToken ct)
    {
        var state = await LoadAsync(command.InstanceId, ct);

        if (state is null)
            return Result.Failure(NotFound("instance"));

        try
        {
            var now = _time.GetUtcNow();
            state.Value.Instance.ResumeTimer(now);
            _runtime.ContinueAfterWait(state.Value.Definition, state.Value.Instance, now);
            await _unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("workflow.timer_conflict", ex.Message));
        }
    }

    public async Task<Result> Handle(
        EscalateWorkflowTaskCommand command,
        CancellationToken ct)
    {
        var state = await LoadAsync(command.InstanceId, ct);

        if (state is null)
            return Result.Failure(NotFound("instance"));

        try
        {
            var now = _time.GetUtcNow();
            var item = state.Value.Instance.EscalateCurrentTask(now);

            _outbox.Enqueue(
                new Mbb.Archive.Modules.Workflow.Contracts.IntegrationEvents.WorkflowTaskEscalatedIntegrationEvent(
                    Guid.CreateVersion7(),
                    state.Value.Instance.Id,
                    item.Id,
                    state.Value.Instance.DocumentId,
                    item.Permission,
                    item.EscalationLevel,
                    now));

            await _unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("workflow.escalation_conflict", ex.Message));
        }
    }

    private async Task<(WorkflowDefinition Definition, WorkflowInstance Instance)?> LoadAsync(
        Guid instanceId,
        CancellationToken ct)
    {
        var instance = await _repository.GetInstanceAsync(instanceId, ct);

        if (instance is null)
            return null;

        var definition = await _repository.GetDefinitionAsync(instance.DefinitionId, ct);

        return definition is null ? null : (definition, instance);
    }

    private static Error NotFound(string kind)
        => Error.NotFound(
            $"workflow.{kind}_not_found",
            $"Workflow {kind} was not found.");

    private static Result<T> Invalid<T>(string message)
        => Result<T>.Failure(Error.Validation("workflow.invalid", message));
}
