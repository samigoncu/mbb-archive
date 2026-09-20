using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
internal sealed class DocumentUnitUsage(DocumentsDbContext db) : IOrganizationUnitUsage
{
    public async Task<bool> HasReferencesAsync(Guid unitId, CancellationToken ct)
        => await db.Set<Mbb.Archive.Modules.Documents.Domain.Documents.Document>().AnyAsync(x => x.OwnerUnitId == unitId, ct)
            || await db.Set<Mbb.Archive.Modules.Documents.Domain.Dossiers.DigitalDossier>().AnyAsync(x => x.OwnerUnitId == unitId, ct);
}
