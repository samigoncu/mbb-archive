using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
internal sealed class PhysicalUnitUsage(PhysicalArchiveDbContext db) : IOrganizationUnitUsage
{
    public Task<bool> HasReferencesAsync(Guid unitId, CancellationToken ct)
        => db.Set<Mbb.Archive.Modules.PhysicalArchive.Domain.Folders.PhysicalFolder>().AnyAsync(x => x.OwnerUnitId == unitId, ct);
}
