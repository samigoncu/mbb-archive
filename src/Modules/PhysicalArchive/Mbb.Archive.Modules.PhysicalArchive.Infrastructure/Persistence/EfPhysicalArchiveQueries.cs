using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class EfPhysicalArchiveQueries : IPhysicalArchiveQueries
{
    private readonly PhysicalArchiveDbContext _db;

    public EfPhysicalArchiveQueries(PhysicalArchiveDbContext db) => _db = db;

    public async Task<IReadOnlyList<LocationListItem>> GetLocationsAsync(
        string? type,
        CancellationToken ct)
    {
        var query = _db.Locations.AsNoTracking();

        if (Enum.TryParse<ArchiveLocationType>(type, ignoreCase: true, out var locationType))
            query = query.Where(x => x.Type == locationType);

        var rows = await query
            .OrderBy(x => x.Code)
            .Select(x => new
            {
                x.Id,
                x.ParentId,
                x.Type,
                x.Code,
                x.Name,
                x.Barcode,
                x.IsActive
            })
            .ToListAsync(ct);

        return rows.Select(x => new LocationListItem(
            x.Id,
            x.ParentId,
            x.Type.ToString(),
            x.Code,
            x.Name,
            x.Barcode,
            x.IsActive)).ToList();
    }

    public async Task<PagedResult<FolderListItem>> GetFoldersPageAsync(
        PageRequest page,
        FolderFilter filter,
        CancellationToken ct)
    {
        var query = _db.Folders.AsNoTracking();

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
            query = query.Where(x => x.FilePlanCode.StartsWith(filePlanCode));
        }

        if (filter.LocationId is { } locationId)
            query = query.Where(x => x.LocationId == locationId);

        if (Enum.TryParse<PhysicalFolderStatus>(filter.Status, ignoreCase: true, out var status))
            query = query.Where(x => x.Status == status);

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
            x.LastMovedAt)).ToList();

        return new PagedResult<FolderListItem>(items, page.Page, page.PageSize, totalCount);
    }

    public async Task<FolderDetails?> GetFolderAsync(Guid id, CancellationToken ct)
    {
        var row = await _db.Folders.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.Barcode,
                x.Title,
                x.FilePlanCode,
                x.LocationId,
                x.Status,
                Documents = x.Documents.Select(d => d.DocumentId).ToList()
            })
            .SingleOrDefaultAsync(ct);

        return row is null ? null : new FolderDetails(
            row.Id,
            row.Barcode,
            row.Title,
            row.FilePlanCode,
            row.LocationId,
            row.Status.ToString(),
            row.Documents);
    }

    public async Task<FolderDetails?> GetFolderByBarcodeAsync(string barcode, CancellationToken ct)
    {
        var normalized = barcode.Trim().ToUpperInvariant();

        var row = await _db.Folders.AsNoTracking()
            .Where(x => x.Barcode == normalized)
            .Select(x => new
            {
                x.Id,
                x.Barcode,
                x.Title,
                x.FilePlanCode,
                x.LocationId,
                x.Status,
                Documents = x.Documents.Select(d => d.DocumentId).ToList()
            })
            .SingleOrDefaultAsync(ct);

        return row is null ? null : new FolderDetails(
            row.Id,
            row.Barcode,
            row.Title,
            row.FilePlanCode,
            row.LocationId,
            row.Status.ToString(),
            row.Documents);
    }

    public async Task<IReadOnlyList<LocationOccupancyItem>> GetLocationOccupancyAsync(
        CancellationToken ct)
    {
        var folders = _db.Folders.AsNoTracking();

        // Doluluk yalnız o konuma doğrudan yerleştirilmiş klasörlerden sayılır;
        // alt düğüm toplamı arayüzde ağaç üzerinden hesaplanır.
        return await _db.Locations.AsNoTracking()
            .OrderBy(x => x.Code)
            .Select(x => new LocationOccupancyItem(
                x.Id,
                x.ParentId,
                x.Type.ToString(),
                x.Code,
                x.Name,
                x.Barcode,
                x.Capacity,
                folders.Count(f => f.LocationId == x.Id)))
            .ToListAsync(ct);
    }

    public async Task<PagedResult<LoanDetailsItem>> GetLoansPageAsync(
        PageRequest page,
        LoanFilter filter,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var query = _db.Loans.AsNoTracking();

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
                    loan.Purpose,
                    loan.Status,
                    loan.CheckedOutAt,
                    loan.DueAt,
                    loan.ReturnedAt
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
                isOverdue ? (int)(now - x.DueAt).TotalDays : 0);
        }).ToList();

        return new PagedResult<LoanDetailsItem>(items, page.Page, page.PageSize, totalCount);
    }

    public async Task<IReadOnlyList<LoanListItem>> GetOverdueLoansAsync(
        DateTimeOffset now,
        CancellationToken ct)
    {
        var rows = await _db.Loans.AsNoTracking()
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
