using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Contracts;
namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;
internal sealed class FilePlanEntryCatalog(ClassificationDbContext db) : IFilePlanEntryCatalog
{
    public async Task<FilePlanEntry?> GetSelectableAsync(Guid planId, Guid itemId, DateOnly at, CancellationToken ct)
    {
        var plan = await db.FilePlans.AsNoTracking().Include(p => p.Items)
            .SingleOrDefaultAsync(p => p.Id == new Mbb.Archive.Modules.Classification.Domain.FilePlans.FilePlanId(planId), ct);
        if (plan is null || !plan.IsActive || plan.EffectiveFrom > at || plan.EffectiveTo < at) return null;
        var item = plan.Items.FirstOrDefault(i => i.Id == new Mbb.Archive.Modules.Classification.Domain.FilePlans.FilePlanItemId(itemId) && i.IsActive && i.IsSelectable);
        return item is null ? null : new(planId, itemId, plan.Version, item.Code, item.Title);
    }
}
