using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;
namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

internal sealed class EfUnitPlanAssignments(OrganizationDbContext db) : IUnitPlanAssignments, IUnitFilePlanPolicy
{
    public async Task<IReadOnlyList<UnitFilePlanAssignment>> GetAsync(OrganizationUnitId unitId, CancellationToken ct)
        => await db.FilePlanAssignments.Where(x => x.UnitId == unitId).ToListAsync(ct);
    public async Task ReplaceAsync(OrganizationUnitId unitId, IReadOnlyList<UnitFilePlanAssignment> items, CancellationToken ct)
    {
        var previous = await GetAsync(unitId, ct);
        var keys = items.Select(x => (x.PlanId, x.ItemId)).ToHashSet();
        db.FilePlanAssignments.RemoveRange(previous.Where(x => !keys.Contains((x.PlanId, x.ItemId))));
        var oldKeys = previous.Select(x => (x.PlanId, x.ItemId)).ToHashSet();
        await db.FilePlanAssignments.AddRangeAsync(items.Where(x => !oldKeys.Contains((x.PlanId, x.ItemId))), ct);
    }
    public async Task<IReadOnlyList<UnitFilePlanEntry>> GetAssignedAsync(Guid unitId, CancellationToken ct)
    {
        var id = new OrganizationUnitId(unitId);
        return await db.FilePlanAssignments.AsNoTracking().Where(x => x.UnitId == id)
            .Select(x => new UnitFilePlanEntry(unitId, x.PlanId, x.ItemId, x.Code, x.Title, x.Version)).ToListAsync(ct);
    }
    public Task<bool> IsAssignedAsync(Guid unitId, Guid planId, Guid itemId, CancellationToken ct)
        => db.FilePlanAssignments.AnyAsync(x => x.UnitId == new OrganizationUnitId(unitId) && x.PlanId == planId && x.ItemId == itemId, ct);
    public Task<bool> IsCodeAssignedAsync(Guid unitId, string code, CancellationToken ct)
        => db.FilePlanAssignments.AnyAsync(x => x.UnitId == new OrganizationUnitId(unitId) && x.Code == code, ct);
}
