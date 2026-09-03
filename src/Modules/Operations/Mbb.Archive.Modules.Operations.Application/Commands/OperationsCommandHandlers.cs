using System.Diagnostics;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Domain.Verifications;

namespace Mbb.Archive.Modules.Operations.Application.Commands;

public sealed class OperationsCommandHandlers :
    ICommandHandler<RunIntegrityVerificationCommand, Guid>,
    ICommandHandler<PlanRecoveryDrillCommand, Guid>,
    ICommandHandler<StartRecoveryDrillCommand>,
    ICommandHandler<CompleteRecoveryDrillCommand>
{
    private readonly IOperationsRepository _repository;
    private readonly IUnitOfWork<OperationsBoundary> _unitOfWork;
    private readonly IEnumerable<IIntegrityVerificationContributor> _verifiers;
    private readonly TimeProvider _timeProvider;

    public OperationsCommandHandlers(
        IOperationsRepository repository,
        IUnitOfWork<OperationsBoundary> unitOfWork,
        IEnumerable<IIntegrityVerificationContributor> verifiers,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _verifiers = verifiers;
        _timeProvider = timeProvider;
    }

    public async Task<Result<Guid>> Handle(
        RunIntegrityVerificationCommand command,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();
        var run = VerificationRun.Start(
            "integrity",
            command.RequestedBy,
            now);

        await _repository.AddVerificationRunAsync(run, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var stopwatch = Stopwatch.StartNew();
        var results = new List<IntegrityVerificationResult>();

        foreach (var verifier in _verifiers.OrderBy(x => x.CheckName))
        {
            results.Add(
                await verifier.VerifyAsync(cancellationToken));
        }

        stopwatch.Stop();

        var checkedItems = results.Sum(x => x.CheckedItems);
        var failedItems = results.Sum(x => x.FailedItems);

        var status = results.Any(x => x.Health == OperationalHealth.Unhealthy)
            ? VerificationRunStatus.Failed
            : results.Any(x => x.Health is OperationalHealth.Degraded or OperationalHealth.Unknown)
                ? VerificationRunStatus.Warning
                : VerificationRunStatus.Passed;

        run.Complete(
            status,
            checkedItems,
            failedItems,
            BuildSummary(results),
            JsonSerializer.Serialize(results),
            _timeProvider.GetUtcNow());

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        ArchiveTelemetry.OperationalVerificationRuns.Add(
            1,
            new KeyValuePair<string, object?>("kind", "integrity"),
            new KeyValuePair<string, object?>("status", status.ToString()));

        ArchiveTelemetry.OperationalVerificationDuration.Record(
            stopwatch.Elapsed.TotalSeconds,
            new KeyValuePair<string, object?>("kind", "integrity"));

        if (status == VerificationRunStatus.Failed)
            ArchiveTelemetry.OperationalVerificationFailures.Add(1);

        return Result<Guid>.Success(run.Id);
    }

    public async Task<Result<Guid>> Handle(
        PlanRecoveryDrillCommand command,
        CancellationToken cancellationToken)
    {
        try
        {
            var drill = RecoveryDrill.Plan(
                command.BackupReference,
                command.TargetEnvironment,
                command.TargetRpoMinutes,
                command.TargetRtoMinutes,
                command.RequestedBy,
                _timeProvider.GetUtcNow());

            await _repository.AddRecoveryDrillAsync(drill, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(drill.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result> Handle(
        StartRecoveryDrillCommand command,
        CancellationToken cancellationToken)
    {
        var drill = await _repository.GetRecoveryDrillAsync(
            command.DrillId,
            cancellationToken);

        if (drill is null)
            return Result.Failure(NotFound("recovery_drill"));

        try
        {
            drill.Start(_timeProvider.GetUtcNow());
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                Error.Conflict(
                    "operations.recovery_drill_conflict",
                    ex.Message));
        }
    }

    public async Task<Result> Handle(
        CompleteRecoveryDrillCommand command,
        CancellationToken cancellationToken)
    {
        var drill = await _repository.GetRecoveryDrillAsync(
            command.DrillId,
            cancellationToken);

        if (drill is null)
            return Result.Failure(NotFound("recovery_drill"));

        try
        {
            drill.Complete(
                command.Passed,
                command.ActualRpoMinutes,
                command.ActualRtoMinutes,
                command.EvidenceReference,
                command.Notes,
                _timeProvider.GetUtcNow());

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            ArchiveTelemetry.OperationalVerificationRuns.Add(
                1,
                new KeyValuePair<string, object?>("kind", "recovery_drill"),
                new KeyValuePair<string, object?>(
                    "status",
                    command.Passed ? "Passed" : "Failed"));

            if (!command.Passed)
                ArchiveTelemetry.OperationalVerificationFailures.Add(1);

            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                Error.Conflict(
                    "operations.recovery_drill_conflict",
                    ex.Message));
        }
    }

    private static string BuildSummary(
        IReadOnlyCollection<IntegrityVerificationResult> results)
    {
        var unhealthy = results.Count(x => x.Health == OperationalHealth.Unhealthy);
        var degraded = results.Count(x => x.Health == OperationalHealth.Degraded);

        return $"Checks: {results.Count}; unhealthy: {unhealthy}; degraded: {degraded}.";
    }

    private static Error NotFound(string entity)
        => Error.NotFound(
            $"operations.{entity}_not_found",
            $"{entity.Replace('_', ' ')} was not found.");

    private static Result<T> Invalid<T>(string message)
        => Result<T>.Failure(
            Error.Validation(
                "operations.invalid",
                message));
}
