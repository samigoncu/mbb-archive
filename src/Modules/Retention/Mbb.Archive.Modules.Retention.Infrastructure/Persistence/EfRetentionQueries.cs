using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class EfRetentionQueries : IRetentionQueries
{
    private readonly RetentionDbContext _db;

    public EfRetentionQueries(RetentionDbContext db) => _db = db;

    public async Task<PagedResult<RetentionCaseListItem>> GetCasesPageAsync(
        PageRequest page,
        RetentionCaseFilter filter,
        CancellationToken ct)
    {
        var query = _db.Cases.AsNoTracking();

        if (Enum.TryParse<RetentionCaseStatus>(filter.Status, ignoreCase: true, out var status))
            query = query.Where(x => x.Status == status);

        if (Enum.TryParse<DispositionAction>(filter.Action, ignoreCase: true, out var action))
            query = query.Where(x => x.Action == action);

        if (filter.HeldOnly)
            query = query.Where(x => x.ActiveHoldCount > 0);

        var totalCount = await query.LongCountAsync(ct);

        var rows = await query
            .OrderBy(x => x.DueAt == null)
            .ThenBy(x => x.DueAt)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new RetentionCaseListItem(
                x.Id,
                x.ArchiveRecordId,
                x.DocumentId,
                x.RuleCode,
                x.Action.ToString(),
                x.Status.ToString(),
                x.TriggerAt,
                x.DueAt,
                x.ActiveHoldCount))
            .ToListAsync(ct);

        return new PagedResult<RetentionCaseListItem>(rows, page.Page, page.PageSize, totalCount);
    }

    public async Task<IReadOnlyList<RetentionRuleListItem>> GetRulesAsync(CancellationToken ct)
    {
        var cases = _db.Cases.AsNoTracking();

        return await _db.Rules.AsNoTracking()
            .OrderBy(x => x.Code)
            .Select(x => new RetentionRuleListItem(
                x.Id,
                x.Code,
                x.Name,
                x.RetentionMonths,
                x.Action.ToString(),
                x.CreatedAt,
                cases.Count(c => c.RuleId == x.Id)))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LegalHoldListItem>> GetHoldsAsync(
        Guid retentionCaseId,
        CancellationToken ct)
        => await _db.Holds.AsNoTracking()
            .Where(x => x.RetentionCaseId == retentionCaseId)
            .OrderByDescending(x => x.PlacedAt)
            .Select(x => new LegalHoldListItem(
                x.Id,
                x.RetentionCaseId,
                x.Reason,
                x.PlacedBy,
                x.PlacedAt,
                x.ReleasedAt,
                x.ReleasedAt == null))
            .ToListAsync(ct);
}
