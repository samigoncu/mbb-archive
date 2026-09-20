using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Application.Validations;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;

internal sealed class EfEvidenceRepository : IEvidenceRepository, IEvidenceQueries
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

    /// <summary>
    /// Bilinmeyen kind/status değeri hata değil boş sonuçtur; eski bağlantılar
    /// listeyi kırmaz.
    /// </summary>
    public async Task<PagedResult<EvidenceValidationListItem>> GetPageAsync(
        PageRequest page,
        string? kind,
        string? status,
        Guid? documentId,
        CancellationToken cancellationToken)
    {
        var query = _db.Validations.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(kind))
        {
            query = Enum.TryParse<EvidenceKind>(kind, true, out var parsedKind)
                ? query.Where(x => x.Kind == parsedKind)
                : query.Where(_ => false);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = Enum.TryParse<EvidenceValidationStatus>(status, true, out var parsedStatus)
                ? query.Where(x => x.Status == parsedStatus)
                : query.Where(_ => false);
        }

        if (documentId is not null)
            query = query.Where(x => x.DocumentId == documentId);

        var total = await query.LongCountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.StartedAt)
            .ThenBy(x => x.Id)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new EvidenceValidationListItem(
                x.Id,
                x.DocumentId,
                x.DocumentVersionId,
                x.Kind.ToString(),
                x.Status.ToString(),
                x.Provider,
                x.Profile,
                x.ContentSha256,
                x.StartedAt,
                x.CompletedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<EvidenceValidationListItem>(
            items,
            page.Page,
            page.PageSize,
            total);
    }
}
