using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;

internal sealed class EfEvidenceRepository : IEvidenceRepository
{
    private readonly EvidenceDbContext _db;

    public EfEvidenceRepository(EvidenceDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(
        EvidenceValidation validation,
        CancellationToken cancellationToken)
        => await _db.Validations.AddAsync(validation, cancellationToken);

    public Task<EvidenceValidation?> GetAsync(
        Guid id,
        CancellationToken cancellationToken)
        => _db.Validations
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
}
