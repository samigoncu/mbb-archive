using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class EfRetentionQueries : IRetentionQueries
{
    private readonly RetentionDbContext _db;
    private readonly IDocumentVisibility _visibility;

    public EfRetentionQueries(RetentionDbContext db, IDocumentVisibility visibility) { _db = db; _visibility = visibility; }

    private async Task<IQueryable<RetentionCase>> VisibleCasesAsync(CancellationToken ct)
    {
        var query = _db.Cases.AsNoTracking();
        var ids = await query.Select(x => x.DocumentId).Distinct().ToArrayAsync(ct);
        var visible = new HashSet<Guid>();
        foreach (var batch in ids.Chunk(500)) visible.UnionWith(await _visibility.FilterAsync(batch, ct));
        return query.Where(x => visible.Contains(x.DocumentId));
    }

    public Task<RetentionCaseListItem?> GetCaseAsync(Guid id, CancellationToken ct)
        => _db.Cases.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new RetentionCaseListItem(x.Id, x.ArchiveRecordId, x.DocumentId,
                x.RuleCode, x.Action.ToString(), x.Status.ToString(), x.TriggerAt, x.DueAt, x.ActiveHoldCount))
            .SingleOrDefaultAsync(ct);

    public async Task<PagedResult<RetentionCaseListItem>> GetCasesPageAsync(
        PageRequest page,
        RetentionCaseFilter filter,
        CancellationToken ct)
    {
        var query = await VisibleCasesAsync(ct);

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
        var cases = await VisibleCasesAsync(ct);

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
                x.ReleasedAt == null,
                x.ReleasedBy,
                x.ReleaseReason))
            .ToListAsync(ct);
}
