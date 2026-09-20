using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class EfPhysicalArchiveRepository : IPhysicalArchiveRepository
{
    private readonly PhysicalArchiveDbContext _db;

    public EfPhysicalArchiveRepository(PhysicalArchiveDbContext db) => _db = db;

    public async Task AddLocationAsync(ArchiveLocation location, CancellationToken ct)
        => await _db.Locations.AddAsync(location, ct);

    public Task<ArchiveLocation?> GetLocationAsync(Guid id, CancellationToken ct)
        => _db.Locations.SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<bool> IdentityExistsAsync(string code, string barcode, CancellationToken ct, Guid? excludeId = null)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var normalizedBarcode = barcode.Trim().ToUpperInvariant();

        return await _db.Locations.AnyAsync(
            x => (excludeId == null || x.Id != excludeId)
                && (x.Code == normalizedCode || x.Barcode == normalizedBarcode),
            ct);
    }

    public Task<bool> LocationHasChildrenAsync(Guid id, CancellationToken ct)
        => _db.Locations.AnyAsync(x => x.ParentId == id, ct);

    /// <summary>Silme korumasının ölçüsü: konumda duran klasör sayısı.</summary>
    public Task<int> FolderCountAtLocationAsync(Guid id, CancellationToken ct)
        => _db.Folders.CountAsync(x => x.LocationId == id, ct);

    public void RemoveLocation(ArchiveLocation location) => _db.Locations.Remove(location);

    public async Task<IReadOnlyList<ArchiveLocationTypeDefinition>> GetLocationTypesAsync(CancellationToken ct)
        => await _db.LocationTypes.OrderBy(x => x.Level).ThenBy(x => x.Name).ToListAsync(ct);

    public Task<ArchiveLocationTypeDefinition?> GetLocationTypeAsync(string code, CancellationToken ct)
        => _db.LocationTypes.SingleOrDefaultAsync(x => x.Code == code, ct);

    /// <summary>Seviye silme koruması: o seviyede konum varsa kaldırılmaz.</summary>
    public Task<int> LocationCountByTypeAsync(string code, CancellationToken ct)
        => _db.Locations.CountAsync(x => x.TypeCode == code, ct);

    public async Task AddLocationTypeAsync(ArchiveLocationTypeDefinition definition, CancellationToken ct)
        => await _db.LocationTypes.AddAsync(definition, ct);

    public void RemoveLocationType(ArchiveLocationTypeDefinition definition) => _db.LocationTypes.Remove(definition);

    public async Task AddFolderAsync(PhysicalFolder folder, CancellationToken ct)
        => await _db.Folders.AddAsync(folder, ct);

    public Task<PhysicalFolder?> GetFolderAsync(Guid id, CancellationToken ct)
        => _db.Folders.Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<PhysicalFolder?> GetFolderByBarcodeAsync(string barcode, CancellationToken ct)
    {
        var normalized = barcode.Trim().ToUpperInvariant();
        return _db.Folders.Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.Barcode == normalized, ct);
    }

    public Task<bool> FolderBarcodeExistsAsync(string barcode, CancellationToken ct)
    {
        var normalized = barcode.Trim().ToUpperInvariant();
        return _db.Folders.AnyAsync(x => x.Barcode == normalized, ct);
    }

    public async Task AddLoanAsync(PhysicalLoan loan, CancellationToken ct)
        => await _db.Loans.AddAsync(loan, ct);

    public Task<PhysicalLoan?> GetLoanAsync(Guid id, CancellationToken ct)
        => _db.Loans.SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<PhysicalLoan?> GetActiveLoanAsync(Guid folderId, CancellationToken ct)
        => _db.Loans.SingleOrDefaultAsync(
            x => x.FolderId == folderId && x.Status != PhysicalLoanStatus.Returned,
            ct);
}
