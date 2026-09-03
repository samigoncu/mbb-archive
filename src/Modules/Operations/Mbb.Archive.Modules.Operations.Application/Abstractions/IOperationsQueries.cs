using Mbb.Archive.Modules.Operations.Application.Models;

namespace Mbb.Archive.Modules.Operations.Application.Abstractions;

public interface IOperationsQueries
{
    Task<IReadOnlyList<AlertRuleDetails>> ListAlertRulesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<AlertInstanceDetails>> ListActiveAlertsAsync(int take, CancellationToken cancellationToken);
    Task<IReadOnlyList<VerificationRunDetails>> ListVerificationRunsAsync(
        int take,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<RecoveryDrillDetails>> ListRecoveryDrillsAsync(
        int take,
        CancellationToken cancellationToken);
}

public interface IOperationsOverviewProvider
{
    Task<OperationsOverview> GetOverviewAsync(
        CancellationToken cancellationToken);
}
