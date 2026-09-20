using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Retention.Application.Abstractions;

public interface IRetentionQueries
{
    Task<RetentionCaseListItem?> GetCaseAsync(Guid id, CancellationToken ct);
    Task<PagedResult<RetentionCaseListItem>> GetCasesPageAsync(
        PageRequest page,
        RetentionCaseFilter filter,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<RetentionRuleListItem>> GetRulesAsync(
        CancellationToken cancellationToken);

    Task<IReadOnlyList<LegalHoldListItem>> GetHoldsAsync(
        Guid retentionCaseId,
        CancellationToken cancellationToken);
}

public sealed record RetentionCaseFilter(
    string? Status = null,
    string? Action = null,
    bool HeldOnly = false);

public sealed record RetentionCaseListItem(
    Guid Id,
    Guid ArchiveRecordId,
    Guid DocumentId,
    string RuleCode,
    string Action,
    string Status,
    DateTimeOffset TriggerAt,
    DateTimeOffset? DueAt,
    int ActiveHoldCount);

public sealed record RetentionRuleListItem(
    Guid Id,
    string Code,
    string Name,
    int RetentionMonths,
    string Action,
    DateTimeOffset CreatedAt,
    int CaseCount);

public sealed record LegalHoldListItem(
    Guid Id,
    Guid RetentionCaseId,
    string Reason,
    string PlacedBy,
    DateTimeOffset PlacedAt,
    DateTimeOffset? ReleasedAt,
    bool IsActive,
    string? ReleasedBy = null,
    string? ReleaseReason = null);
