using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Persistence;

internal sealed class EfEypInspectionRepository
    : IEypInspectionRepository
{
    private readonly OfficialCorrespondenceDbContext _db;

    public EfEypInspectionRepository(
        OfficialCorrespondenceDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(
        EypPackageInspection inspection,
        CancellationToken cancellationToken)
        => await _db.EypInspections.AddAsync(inspection, cancellationToken);

    public Task<EypPackageInspection?> GetAsync(
        Guid id,
        CancellationToken cancellationToken)
        => _db.EypInspections
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
}
