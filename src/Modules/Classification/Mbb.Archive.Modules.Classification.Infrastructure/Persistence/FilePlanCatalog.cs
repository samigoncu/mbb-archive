using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Contracts;

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;

internal sealed class FilePlanCatalog(ClassificationDbContext db) : IFilePlanCatalog
{
    public Task<bool> IsSelectableAsync(string code, DateOnly at, CancellationToken cancellationToken)
        => db.FilePlans.AsNoTracking().AnyAsync(
            plan => plan.IsActive && plan.EffectiveFrom <= at
                && (plan.EffectiveTo == null || plan.EffectiveTo >= at)
                && plan.Items.Any(item => item.Code == code && item.IsActive && item.IsSelectable),
            cancellationToken);
}
