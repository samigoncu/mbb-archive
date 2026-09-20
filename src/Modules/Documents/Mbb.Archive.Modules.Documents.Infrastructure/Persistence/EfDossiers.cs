using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class EfDossiers(DocumentsDbContext db, IArchiveUnitDirectory units, ICurrentUserScope scopes)
    : IDossierRepository, IDossierQueries, IArchiveFilingCatalog
{
    public async Task<bool> RenameAsync(Guid id, string expectedTitle, string title, CancellationToken ct)
        => await db.Dossiers.Where(d => d.Id == id && d.Title == expectedTitle).ExecuteUpdateAsync(setters => setters.SetProperty(d => d.Title, title), ct) == 1;
    public async Task AddAsync(DigitalDossier dossier, CancellationToken ct) => await db.Dossiers.AddAsync(dossier, ct);
    Task<DigitalDossier?> IDossierRepository.GetAsync(Guid id, CancellationToken ct) => db.Dossiers.SingleOrDefaultAsync(d => d.Id == id, ct);
    public async Task<PagedResult<DossierItem>> ListAsync(PageRequest page, DossierFilter filter, CancellationToken ct)
    {
        var visibleUnits = await units.GetVisibleAsync(ct);
        var scope = await scopes.GetAsync(ct);
        var ids = visibleUnits.Select(u => u.Id).ToArray();
        var query = db.Dossiers.AsNoTracking().Where(d => scope.Unrestricted || ids.Contains(d.OwnerUnitId));
        if (filter.OwnerUnitId is { } owner)
        {
            var parent = visibleUnits.FirstOrDefault(u => u.Id == owner);
            var children = visibleUnits.Where(u => parent is not null && u.Path.StartsWith(parent.Path, StringComparison.Ordinal)).Select(u => u.Id).ToArray();
            query = query.Where(d => children.Contains(d.OwnerUnitId));
        }
        if (filter.FilePlanCode is { Length: > 0 } code) query = query.Where(d => d.FilePlanCode == code || d.FilePlanCode.StartsWith(code + "."));
        if (filter.Year is { } year) query = query.Where(d => d.Year == year);
        if (filter.Search is { Length: > 0 } search) query = query.Where(d => EF.Functions.ILike(d.Title, $"%{search}%"));
        var total = await query.LongCountAsync(ct);
        var ordered = filter.Sort switch
        {
            "titleAsc" => query.OrderBy(d => d.Title),
            "titleDesc" => query.OrderByDescending(d => d.Title),
            "oldest" => query.OrderBy(d => d.CreatedAt),
            "newest" => query.OrderByDescending(d => d.CreatedAt),
            _ => query.OrderBy(d => d.OwnerUnitId).ThenBy(d => d.FilePlanCode).ThenByDescending(d => d.Year).ThenBy(d => d.Title)
        };
        var rows = await ordered.ThenBy(d => d.Id)
            .Skip((page.Page - 1) * page.PageSize).Take(page.PageSize)
            .Select(d => new { Dossier = d, Count = db.Documents.Count(doc => doc.DossierId == d.Id && doc.Status != DocumentStatus.Cancelled) }).ToListAsync(ct);
        var names = visibleUnits.ToDictionary(u => u.Id, u => u.Name);
        return new(rows.Select(r => Map(r.Dossier, names.GetValueOrDefault(r.Dossier.OwnerUnitId, "Birim bulunamadı"), r.Count)).ToArray(), page.Page, page.PageSize, total);
    }
    public async Task<DossierItem?> GetAsync(Guid id, CancellationToken ct)
    {
        var visibleUnits = await units.GetVisibleAsync(ct);
        var scope = await scopes.GetAsync(ct);
        var ids = visibleUnits.Select(u => u.Id).ToArray();
        var dossier = await db.Dossiers.AsNoTracking().SingleOrDefaultAsync(d => d.Id == id && (scope.Unrestricted || ids.Contains(d.OwnerUnitId)), ct);
        if (dossier is null) return null;
        return Map(dossier, visibleUnits.FirstOrDefault(u => u.Id == dossier.OwnerUnitId)?.Name ?? "Birim bulunamadı",
            await db.Documents.CountAsync(d => d.DossierId == id && d.Status != DocumentStatus.Cancelled, ct));
    }
    public async Task<FilingDossier?> GetDossierAsync(Guid id, CancellationToken ct)
    {
        var d = await GetAsync(id, ct);
        return d is null ? null : new(d.Id, d.OwnerUnitId, d.FilePlanCode);
    }
    public async Task<FilingDocument?> GetDocumentAsync(Guid id, CancellationToken ct)
    {
        var scope = await scopes.GetAsync(ct);
        return await db.Documents.AsNoTracking().Where(DocumentAccessFilter.For(scope))
            .Where(d => d.Id == new DocumentId(id) && d.Status != DocumentStatus.Cancelled)
            .Select(d => new FilingDocument(d.Id.Value, d.OwnerUnitId, d.FilePlanCode, d.DossierId,
                d.Versions.Where(v => v.VersionNumber == d.CurrentVersionNumber).Select(v => (Guid?)v.Id).FirstOrDefault())).SingleOrDefaultAsync(ct);
    }
    public async Task<Guid?> GetDocumentVersionIdAsync(Guid id, int versionNumber, CancellationToken ct)
    {
        var scope = await scopes.GetAsync(ct);
        return await db.Documents.AsNoTracking().Where(DocumentAccessFilter.For(scope))
            .Where(d => d.Id == new DocumentId(id)).SelectMany(d => d.Versions)
            .Where(v => v.VersionNumber == versionNumber).Select(v => (Guid?)v.Id).SingleOrDefaultAsync(ct);
    }
    private static DossierItem Map(DigitalDossier d, string name, int count) => new(d.Id, d.OwnerUnitId, name,
        d.FilePlanId, d.FilePlanItemId, d.FilePlanVersion, d.FilePlanCode, d.FilePlanTitle, d.Title, d.Year, count);
}
