using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Rules;
namespace Mbb.Archive.Modules.Retention.Application.Abstractions;

public interface IRetentionRepository
{
    Task AddRuleAsync(RetentionRule rule, CancellationToken ct);
    Task<RetentionRule?> GetRuleByCodeAsync(string code, CancellationToken ct);
    Task AddCaseAsync(RetentionCase retentionCase, CancellationToken ct);
    Task<RetentionCase?> GetCaseAsync(Guid id, CancellationToken ct);
    Task<RetentionCase?> GetCaseByRecordAsync(Guid recordId, CancellationToken ct);
    Task AddHoldAsync(LegalHold hold, CancellationToken ct);
    Task<LegalHold?> GetHoldAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<LegalHold>> GetActiveHoldsAsync(Guid caseId, CancellationToken ct);
    Task<IReadOnlyList<RetentionCase>> GetDueCasesAsync(DateTimeOffset now, int limit, CancellationToken ct);
}
