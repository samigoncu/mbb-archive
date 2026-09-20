using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Rules;
namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class EfRetentionRepository(RetentionDbContext db) : IRetentionRepository
{
    public async Task AddRuleAsync(RetentionRule rule, CancellationToken ct) => await db.Rules.AddAsync(rule, ct);
    public Task<RetentionRule?> GetRuleByCodeAsync(string code, CancellationToken ct) => db.Rules.SingleOrDefaultAsync(x => x.Code == code, ct);
    public async Task AddCaseAsync(RetentionCase retentionCase, CancellationToken ct) => await db.Cases.AddAsync(retentionCase, ct);
    public Task<RetentionCase?> GetCaseAsync(Guid id, CancellationToken ct) => db.Cases.SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<RetentionCase?> GetCaseByRecordAsync(Guid recordId, CancellationToken ct) => db.Cases.SingleOrDefaultAsync(x => x.ArchiveRecordId == recordId, ct);
    public async Task AddHoldAsync(LegalHold hold, CancellationToken ct) => await db.Holds.AddAsync(hold, ct);
    public Task<LegalHold?> GetHoldAsync(Guid id, CancellationToken ct) => db.Holds.SingleOrDefaultAsync(x => x.Id == id, ct);
    public async Task<IReadOnlyList<LegalHold>> GetActiveHoldsAsync(Guid caseId, CancellationToken ct)
        => await db.Holds.Where(x => x.RetentionCaseId == caseId && x.ReleasedAt == null).OrderBy(x => x.PlacedAt).Take(2).ToListAsync(ct);
    public async Task<IReadOnlyList<RetentionCase>> GetDueCasesAsync(DateTimeOffset now, int limit, CancellationToken ct)
        => await db.Cases.Where(x => x.Status == RetentionCaseStatus.Scheduled && x.DueAt != null
            && x.DueAt <= now && x.ActiveHoldCount == 0).OrderBy(x => x.DueAt).Take(limit).ToListAsync(ct);
}
