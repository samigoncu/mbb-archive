using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Models;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Application.Automation;

namespace Mbb.Archive.Modules.Operations.Application.Alerts;

public sealed record CreateAlertRuleCommand(string Code, string Metric, AlertComparison Comparison,
    decimal Threshold, AlertSeverity Severity, int EvaluationWindowMinutes, NotificationChannel? NotificationChannel = null, string? NotificationTarget = null) : ICommand<Guid>;
public sealed record AcknowledgeAlertCommand(Guid AlertId, string Subject, string Note) : ICommand;
public sealed record ResolveAlertCommand(Guid AlertId) : ICommand;

public sealed class AlertCommandHandlers
{
    private readonly IOperationsRepository _repository; private readonly IUnitOfWork<OperationsBoundary> _unit;
    private readonly TimeProvider _time;
    public AlertCommandHandlers(IOperationsRepository repository, IUnitOfWork<OperationsBoundary> unit, TimeProvider time)
    { _repository = repository; _unit = unit; _time = time; }

    public async Task<Result<Guid>> Handle(CreateAlertRuleCommand command, CancellationToken ct)
    {
        if (!OperationsMetricCatalog.All.Contains(command.Metric))
            return Result<Guid>.Failure(Error.Validation("operations.metric_invalid", "Desteklenen bir ölçüm seçin."));
        try { var rule = AlertRule.Create(command.Code, command.Metric, command.Comparison, command.Threshold,
            command.Severity, TimeSpan.FromMinutes(command.EvaluationWindowMinutes), _time.GetUtcNow());
            rule.SetNotification(command.NotificationChannel, command.NotificationTarget);
            await _repository.AddAlertRuleAsync(rule, ct); await _unit.SaveChangesAsync(ct); return Result<Guid>.Success(rule.Id); }
        catch (ConcurrencyConflictException ex) { return Result<Guid>.Failure(Error.Conflict("operations.alert_conflict", ex.Message)); }
        catch (DomainRuleViolationException ex) { return Result<Guid>.Failure(Error.Validation("operations.alert_rule_invalid", ex.Message)); }
    }

    public async Task<Result> Handle(AcknowledgeAlertCommand command, CancellationToken ct)
    {
        var alert = await _repository.GetAlertInstanceAsync(command.AlertId, ct);
        if (alert is null) return Result.Failure(Error.NotFound("operations.alert_not_found", "Alert was not found."));
        try { alert.Acknowledge(command.Subject, command.Note, _time.GetUtcNow()); await _unit.SaveChangesAsync(ct); return Result.Success(); }
        catch (ConcurrencyConflictException ex) { return Result.Failure(Error.Conflict("operations.alert_conflict", ex.Message)); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("operations.alert_conflict", ex.Message)); }
    }

    public async Task<Result> Handle(ResolveAlertCommand command, CancellationToken ct)
    {
        var alert = await _repository.GetAlertInstanceAsync(command.AlertId, ct);
        if (alert is null) return Result.Failure(Error.NotFound("operations.alert_not_found", "Alert was not found."));
        try { alert.Resolve(_time.GetUtcNow()); await _unit.SaveChangesAsync(ct); return Result.Success(); }
        catch (ConcurrencyConflictException ex) { return Result.Failure(Error.Conflict("operations.alert_conflict", ex.Message)); }
    }
}

public sealed class AlertQueryHandlers
{
    private readonly IOperationsQueries _queries;
    public AlertQueryHandlers(IOperationsQueries queries) { _queries = queries; }
    public Task<IReadOnlyList<AlertRuleDetails>> Rules(CancellationToken ct) => _queries.ListAlertRulesAsync(ct);
    public Task<IReadOnlyList<AlertInstanceDetails>> Active(int take, CancellationToken ct) => _queries.ListActiveAlertsAsync(Math.Clamp(take, 1, 200), ct);
}
