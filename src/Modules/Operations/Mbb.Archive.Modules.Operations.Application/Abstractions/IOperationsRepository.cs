using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Domain.Verifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;

namespace Mbb.Archive.Modules.Operations.Application.Abstractions;

public interface IOperationsRepository
{
    Task AddAlertRuleAsync(AlertRule rule, CancellationToken cancellationToken);
    Task<AlertRule?> GetAlertRuleAsync(Guid id, CancellationToken cancellationToken);
    Task<AlertInstance?> GetAlertInstanceAsync(Guid id, CancellationToken cancellationToken);
    Task AddVerificationRunAsync(
        VerificationRun run,
        CancellationToken cancellationToken);

    Task<VerificationRun?> GetVerificationRunAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task AddRecoveryDrillAsync(
        RecoveryDrill drill,
        CancellationToken cancellationToken);

    Task<RecoveryDrill?> GetRecoveryDrillAsync(
        Guid id,
        CancellationToken cancellationToken);
}
