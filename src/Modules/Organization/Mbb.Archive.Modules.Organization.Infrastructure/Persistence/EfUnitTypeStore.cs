using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Organization.Application.Units;
using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

internal sealed class EfUnitTypeStore(OrganizationDbContext db) : IUnitTypeStore
{
    public async Task<IReadOnlyList<OrganizationUnitTypeDefinition>> ListAsync(CancellationToken ct)
        => await db.UnitTypes.OrderBy(x => x.Level).ThenBy(x => x.Name).ToListAsync(ct);

    public Task<OrganizationUnitTypeDefinition?> FindAsync(string code, CancellationToken ct)
        => db.UnitTypes.FirstOrDefaultAsync(x => x.Code == code, ct);

    public Task AddAsync(OrganizationUnitTypeDefinition definition, CancellationToken ct)
        => db.UnitTypes.AddAsync(definition, ct).AsTask();

    public void Remove(OrganizationUnitTypeDefinition definition) => db.UnitTypes.Remove(definition);

    /// <remarks>Kaldırılmış birimler sayılmaz; onlar silme engeli oluşturmaz.</remarks>
    public Task<int> UnitCountAsync(string code, CancellationToken ct)
        => db.Units.CountAsync(x => x.TypeCode == code && !x.IsRemoved, ct);
}
