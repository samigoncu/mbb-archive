using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class EfPhysicalArchiveQueries : IPhysicalArchiveQueries
{
    private readonly PhysicalArchiveDbContext _db;

    private readonly IArchiveUnitDirectory _units;
    private readonly ICurrentUserScope _scopes;
    public EfPhysicalArchiveQueries(PhysicalArchiveDbContext db, IArchiveUnitDirectory units, ICurrentUserScope scopes)
    { _db = db; _units = units; _scopes = scopes; }

    private async Task<IQueryable<PhysicalFolder>> VisibleFolders(CancellationToken ct)
    {
        var ids = (await _units.GetVisibleAsync(ct)).Select(u => u.Id).ToArray();
        var scope = await _scopes.GetAsync(ct);
        return _db.Folders.AsNoTracking().Where(f => scope.Unrestricted || (f.OwnerUnitId != null && ids.Contains(f.OwnerUnitId.Value)));
    }

    public async Task<IReadOnlyList<LocationListItem>> GetLocationsAsync(
        string? type,
        CancellationToken ct)
    {
        var query = _db.Locations.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(type))
        {
            var typeCode = type.Trim();
            query = query.Where(x => x.TypeCode == typeCode);
        }

        var rows = await query
            .OrderBy(x => x.Code)
            .Select(x => new
            {
                x.Id,
                x.ParentId,
                x.TypeCode,
                x.Code,
                x.Name,
                x.Barcode,
                x.IsActive
            })
            .ToListAsync(ct);

        // Seviye adı ve klasör taşıma kuralı katalogdan gelir; arayüzde sabit
        // bir tür listesi tutulmasın diye burada birleştirilir.
        var types = await _db.LocationTypes.AsNoTracking().ToDictionaryAsync(x => x.Code, ct);

        return rows.Select(x => new LocationListItem(
            x.Id,
            x.ParentId,
            x.TypeCode,
            x.Code,
            x.Name,
            x.Barcode,
            x.IsActive,
            types.TryGetValue(x.TypeCode, out var type) ? type.Name : x.TypeCode,
            type is not null && type.CanStoreFolder)).ToList();
    }

    public async Task<PagedResult<FolderListItem>> GetFoldersPageAsync(
        PageRequest page,
        FolderFilter filter,
        CancellationToken ct)
    {
        var query = await VisibleFolders(ct);
        if (filter.OwnerUnitId is { } owner)
        {
            var units = await _units.GetVisibleAsync(ct);
            var parent = units.FirstOrDefault(u => u.Id == owner);
            var ids = units.Where(u => parent is not null && u.Path.StartsWith(parent.Path, StringComparison.Ordinal)).Select(u => u.Id).ToArray();
            query = query.Where(f => f.OwnerUnitId != null && ids.Contains(f.OwnerUnitId.Value));
        }
        if (filter.DigitalDossierId is { } dossier) query = query.Where(f => f.DigitalDossierId == dossier);

        if (!string.IsNullOrWhiteSpace(filter.Barcode))
        {
            var barcode = filter.Barcode.Trim().ToUpperInvariant();
            query = query.Where(x => x.Barcode.Contains(barcode));
        }

        if (!string.IsNullOrWhiteSpace(filter.Title))
            query = query.Where(x => EF.Functions.ILike(x.Title, $"%{filter.Title.Trim()}%"));

        if (!string.IsNullOrWhiteSpace(filter.FilePlanCode))
        {
            var filePlanCode = filter.FilePlanCode.Trim();
            query = query.Where(x => (x.FilePlanCode == filePlanCode || x.FilePlanCode.StartsWith(filePlanCode + ".")));
        }

        if (filter.LocationId is { } locationId)
            query = query.Where(x => x.LocationId == locationId);

        if (Enum.TryParse<PhysicalFolderStatus>(filter.Status, ignoreCase: true, out var status))
        {
            query = query.Where(x => x.Status == status);
            if (status == PhysicalFolderStatus.Available)
            {
                var activeLoanFolderIds = _db.Loans
                    .Where(l => l.Status != PhysicalLoanStatus.Returned)
                    .Select(l => l.FolderId);
                query = query.Where(x => !activeLoanFolderIds.Contains(x.Id));
            }
        }

        if (filter.Year is { } year)
            query = query.Where(x => x.CreatedAt.Year == year);

        // Belge görüntüleyicideki "fiziksel konum" sekmesi bu filtreyi kullanır.
        if (filter.ContainsDocumentId is { } documentId)
            query = query.Where(x => x.Documents.Any(d => d.DocumentId == documentId));

        var totalCount = await query.LongCountAsync(ct);

        // Konum bilgisi ayrı bir bounded context değil; aynı context içinde join edilir.
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Join(
                _db.Locations.AsNoTracking(),
                folder => folder.LocationId,
                location => location.Id,
                (folder, location) => new
                {
                    folder.Id,
                    folder.Barcode,
                    folder.Title,
                    folder.FilePlanCode,
                    folder.LocationId,
                    LocationCode = location.Code,
                    LocationName = location.Name,
                    folder.Status,
                    DocumentCount = folder.Documents.Count,
                    folder.CreatedAt,
                    folder.OwnerUnitId,
                    folder.DigitalDossierId,
                    folder.LastMovedAt
                })
            .ToListAsync(ct);

        var items = rows.Select(x => new FolderListItem(
            x.Id,
            x.Barcode,
            x.Title,
            x.FilePlanCode,
            x.LocationId,
            x.LocationCode,
            x.LocationName,
            x.Status.ToString(),
            x.DocumentCount,
            x.CreatedAt,
            x.LastMovedAt, x.OwnerUnitId, x.DigitalDossierId)).ToList();

        return new PagedResult<FolderListItem>(items, page.Page, page.PageSize, totalCount);
    }

    public async Task<FolderDetails?> GetFolderAsync(Guid id, CancellationToken ct)
    {
        var row = await (await VisibleFolders(ct))
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.Barcode,
                x.Title,
                x.FilePlanCode,
                x.LocationId,
                x.Status,
                x.OwnerUnitId,
                x.DigitalDossierId,
                Documents = x.Documents.Select(d => d.DocumentId).ToList(),
                Dispositions = x.Documents.Where(d => d.DispositionProcessId != null).Select(d =>
                    new PhysicalDispositionDetails(d.DocumentId, d.DispositionProcessId!.Value, d.DisposedAt!.Value,
                        d.DisposedBy!, d.DispositionReference!, d.DispositionEvidenceDocumentId!.Value)).ToList()
            })
            .SingleOrDefaultAsync(ct);

        return row is null ? null : new FolderDetails(
            row.Id,
            row.Barcode,
            row.Title,
            row.FilePlanCode,
            row.LocationId,
            row.Status.ToString(),
            row.Documents, row.OwnerUnitId, row.DigitalDossierId, row.Dispositions);
    }

    public async Task<FolderDetails?> GetFolderByBarcodeAsync(string barcode, CancellationToken ct)
    {
        var normalized = barcode.Trim().ToUpperInvariant();

        var row = await (await VisibleFolders(ct))
            .Where(x => x.Barcode == normalized)
            .Select(x => new
            {
                x.Id,
                x.Barcode,
                x.Title,
                x.FilePlanCode,
                x.LocationId,
                x.Status,
                x.OwnerUnitId,
                x.DigitalDossierId,
                Documents = x.Documents.Select(d => d.DocumentId).ToList(),
                Dispositions = x.Documents.Where(d => d.DispositionProcessId != null).Select(d =>
                    new PhysicalDispositionDetails(d.DocumentId, d.DispositionProcessId!.Value, d.DisposedAt!.Value,
                        d.DisposedBy!, d.DispositionReference!, d.DispositionEvidenceDocumentId!.Value)).ToList()
            })
            .SingleOrDefaultAsync(ct);

        return row is null ? null : new FolderDetails(
            row.Id,
            row.Barcode,
            row.Title,
            row.FilePlanCode,
            row.LocationId,
            row.Status.ToString(),
            row.Documents, row.OwnerUnitId, row.DigitalDossierId, row.Dispositions);
    }

    public async Task<IReadOnlyList<LocationOccupancyItem>> GetLocationOccupancyAsync(
        CancellationToken ct)
    {
        var folders = await VisibleFolders(ct);

        // Doluluk yalnız o konuma doğrudan yerleştirilmiş klasörlerden sayılır;
        // alt düğüm toplamı arayüzde ağaç üzerinden hesaplanır.
        var types = await _db.LocationTypes.AsNoTracking().ToDictionaryAsync(x => x.Code, ct);

        var rows = await _db.Locations.AsNoTracking()
            .OrderBy(x => x.Code)
            .Select(x => new
            {
                x.Id,
                x.ParentId,
                x.TypeCode,
                x.Code,
                x.Name,
                x.Barcode,
                x.Capacity,
                x.IsActive,
                FolderCount = folders.Count(f => f.LocationId == x.Id),
            })
            .ToListAsync(ct);

        return rows.Select(x =>
        {
            types.TryGetValue(x.TypeCode, out var type);
            return new LocationOccupancyItem(
                x.Id, x.ParentId, x.TypeCode, x.Code, x.Name, x.Barcode, x.Capacity,
                x.FolderCount, x.IsActive,
                type?.Name ?? x.TypeCode,
                type?.Level ?? 0,
                type?.CanStoreFolder ?? false,
                type?.AllowsCapacity ?? false);
        }).ToList();
    }

    public async Task<PagedResult<LoanDetailsItem>> GetLoansPageAsync(
        PageRequest page,
        LoanFilter filter,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var folders = await VisibleFolders(ct);
        var query = _db.Loans.AsNoTracking().Where(l => folders.Any(f => f.Id == l.FolderId));

        if (Enum.TryParse<PhysicalLoanStatus>(filter.Status, ignoreCase: true, out var status))
            query = query.Where(x => x.Status == status);

        if (filter.FolderId is { } folderId)
            query = query.Where(x => x.FolderId == folderId);

        if (!string.IsNullOrWhiteSpace(filter.BorrowerSubjectId))
        {
            var borrower = filter.BorrowerSubjectId.Trim();
            query = query.Where(x => EF.Functions.ILike(x.BorrowerSubjectId, $"%{borrower}%"));
        }

        // Gecikme kayıtlı statüden değil, iade durumu ve vade tarihinden hesaplanır;
        // MarkOverdue çalışmamış olsa bile liste doğru sonucu verir.
        if (filter.OverdueOnly)
            query = query.Where(x => x.Status != PhysicalLoanStatus.Returned && x.DueAt < now);

        // İadesi yaklaşanlar: henüz gecikmemiş, verilen gün içinde vadesi dolacaklar.
        if (filter.DueInDays is { } dueInDays)
        {
            var threshold = now.AddDays(dueInDays);
            query = query.Where(x =>
                x.Status != PhysicalLoanStatus.Returned
                && x.DueAt >= now
                && x.DueAt <= threshold);
        }

        var totalCount = await query.LongCountAsync(ct);

        var rows = await query
            .OrderBy(x => x.Status == PhysicalLoanStatus.Returned)
            .ThenBy(x => x.DueAt)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Join(
                _db.Folders.AsNoTracking(),
                loan => loan.FolderId,
                folder => folder.Id,
                (loan, folder) => new
                {
                    loan.Id,
                    loan.FolderId,
                    FolderBarcode = folder.Barcode,
                    FolderTitle = folder.Title,
                    folder.FilePlanCode,
                    loan.BorrowerSubjectId,
                    loan.CheckedOutBy,
                    loan.Purpose,
                    loan.Status,
                    loan.CheckedOutAt,
                    loan.DueAt,
                    loan.ReturnedAt,
                    loan.ReturnNote
                })
            .ToListAsync(ct);

        var items = rows.Select(x =>
        {
            var isOverdue = x.Status != PhysicalLoanStatus.Returned && x.DueAt < now;

            return new LoanDetailsItem(
                x.Id,
                x.FolderId,
                x.FolderBarcode,
                x.FolderTitle,
                x.FilePlanCode,
                x.BorrowerSubjectId,
                x.Purpose,
                x.Status.ToString(),
                x.CheckedOutAt,
                x.DueAt,
                x.ReturnedAt,
                isOverdue,
                isOverdue ? (int)(now - x.DueAt).TotalDays : 0,
                x.ReturnNote,
                x.CheckedOutBy);
        }).ToList();

        return new PagedResult<LoanDetailsItem>(items, page.Page, page.PageSize, totalCount);
    }

    public async Task<IReadOnlyList<LoanListItem>> GetOverdueLoansAsync(
        DateTimeOffset now,
        CancellationToken ct)
    {
        var folders = await VisibleFolders(ct);
        var rows = await _db.Loans.AsNoTracking().Where(l => folders.Any(f => f.Id == l.FolderId))
            .Where(x =>
                x.Status != PhysicalLoanStatus.Returned
                && x.DueAt < now)
            .OrderBy(x => x.DueAt)
            .ToListAsync(ct);

        return rows.Select(x => new LoanListItem(
            x.Id,
            x.FolderId,
            x.BorrowerSubjectId,
            x.Purpose,
            x.Status.ToString(),
            x.CheckedOutAt,
            x.DueAt)).ToList();
    }
}
