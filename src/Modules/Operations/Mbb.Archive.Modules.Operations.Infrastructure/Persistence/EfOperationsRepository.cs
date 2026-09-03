using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Models;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Domain.Verifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence;

internal sealed class EfOperationsRepository :
    IOperationsRepository,
    IOperationsQueries
{
    private readonly OperationsDbContext _dbContext;

    public EfOperationsRepository(OperationsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddVerificationRunAsync(
        VerificationRun run,
        CancellationToken cancellationToken)
        => await _dbContext.VerificationRuns.AddAsync(run, cancellationToken);

    public async Task AddAlertRuleAsync(AlertRule rule, CancellationToken cancellationToken)
        => await _dbContext.AlertRules.AddAsync(rule, cancellationToken);
    public Task<AlertRule?> GetAlertRuleAsync(Guid id, CancellationToken cancellationToken)
        => _dbContext.AlertRules.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    public Task<AlertInstance?> GetAlertInstanceAsync(Guid id, CancellationToken cancellationToken)
        => _dbContext.AlertInstances.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    public async Task<IReadOnlyList<AlertRuleDetails>> ListAlertRulesAsync(CancellationToken cancellationToken)
        => await _dbContext.AlertRules.AsNoTracking().OrderBy(x => x.Code).Select(x => new AlertRuleDetails(x.Id, x.Code,
            x.Metric, x.Comparison.ToString(), x.Threshold, x.Severity.ToString(), x.EvaluationWindow, x.IsEnabled)).ToListAsync(cancellationToken);
    public async Task<IReadOnlyList<AlertInstanceDetails>> ListActiveAlertsAsync(int take, CancellationToken cancellationToken)
        => await _dbContext.AlertInstances.AsNoTracking().Where(x => x.Status != AlertStatus.Resolved)
            .OrderByDescending(x => x.LastObservedAt).Take(take).Select(x => new AlertInstanceDetails(x.Id, x.RuleId,
                x.DeduplicationKey, x.Severity.ToString(), x.Status.ToString(), x.CurrentValue, x.OccurrenceCount,
                x.OpenedAt, x.LastObservedAt, x.ResolvedAt)).ToListAsync(cancellationToken);

    public Task<VerificationRun?> GetVerificationRunAsync(
        Guid id,
        CancellationToken cancellationToken)
        => _dbContext.VerificationRuns
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task AddRecoveryDrillAsync(
        RecoveryDrill drill,
        CancellationToken cancellationToken)
        => await _dbContext.RecoveryDrills.AddAsync(drill, cancellationToken);

    public Task<RecoveryDrill?> GetRecoveryDrillAsync(
        Guid id,
        CancellationToken cancellationToken)
        => _dbContext.RecoveryDrills
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<VerificationRunDetails>>
        ListVerificationRunsAsync(
            int take,
            CancellationToken cancellationToken)
        => await _dbContext.VerificationRuns
            .AsNoTracking()
            .OrderByDescending(x => x.StartedAt)
            .Take(take)
            .Select(x => new VerificationRunDetails(
                x.Id,
                x.Kind,
                x.RequestedBy,
                x.Status.ToString(),
                x.StartedAt,
                x.CompletedAt,
                x.CheckedItems,
                x.FailedItems,
                x.Summary))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RecoveryDrillDetails>>
        ListRecoveryDrillsAsync(
            int take,
            CancellationToken cancellationToken)
        => await _dbContext.RecoveryDrills
            .AsNoTracking()
            .OrderByDescending(x => x.PlannedAt)
            .Take(take)
            .Select(x => new RecoveryDrillDetails(
                x.Id,
                x.BackupReference,
                x.TargetEnvironment,
                x.Status.ToString(),
                x.TargetRpoMinutes,
                x.TargetRtoMinutes,
                x.ActualRpoMinutes,
                x.ActualRtoMinutes,
                x.EvidenceReference,
                x.PlannedAt,
                x.CompletedAt))
            .ToListAsync(cancellationToken);
}
