using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Disposition;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class EfDispositionRepository(RetentionDbContext db, IDocumentVisibility visibility) : IDispositionRepository
{
    public Task<DispositionProcess?> GetAsync(Guid id, CancellationToken ct)
        => db.Set<DispositionProcess>().Include(x => x.Reviews).Include(x => x.Members).SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> HasOpenProcessAsync(Guid caseId, CancellationToken ct)
        => db.Set<DispositionProcess>().AnyAsync(x => x.RetentionCaseId == caseId
            && x.Status != DispositionProcessStatus.Rejected && x.Status != DispositionProcessStatus.Completed, ct);
    public async Task AddAsync(DispositionProcess process, CancellationToken ct)
        => await db.Set<DispositionProcess>().AddAsync(process, ct);
    public async Task<PagedResult<DispositionProcess>> ListAsync(PageRequest page, string? status, CancellationToken ct)
    {
        var query = db.Set<DispositionProcess>().AsNoTracking();
        var visible = new HashSet<Guid>();
        var candidates = await query.Select(x => x.DocumentId).Distinct().ToArrayAsync(ct);
        foreach (var batch in candidates.Chunk(500)) visible.UnionWith(await visibility.FilterAsync(batch, ct));
        query = query.Where(x => visible.Contains(x.DocumentId));
        if (Enum.TryParse<DispositionProcessStatus>(status, out var parsed)) query = query.Where(x => x.Status == parsed);
        var count = await query.LongCountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id)
            .Skip((page.Page - 1) * page.PageSize).Take(page.PageSize).Include(x => x.Reviews).Include(x => x.Members).ToListAsync(ct);
        return new PagedResult<DispositionProcess>(rows, page.Page, page.PageSize, count);
    }
}
