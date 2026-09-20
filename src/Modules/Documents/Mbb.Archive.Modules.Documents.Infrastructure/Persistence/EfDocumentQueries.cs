using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class EfDocumentQueries : IDocumentQueries
{
    private readonly DocumentsDbContext _dbContext;
    private readonly IArchiveUnitDirectory _units;

    public EfDocumentQueries(DocumentsDbContext dbContext, IArchiveUnitDirectory units)
    {
        _dbContext = dbContext;
        _units = units;
    }

    /// <summary>
    /// Kapsam yüklemi her sorguya aynı kaynaktan uygulanır; hiçbir okuma yolu
    /// süzgeçsiz kalmaz.
    /// </summary>
    private IQueryable<Document> Visible(AccessScope scope)
        => _dbContext.Documents.AsNoTracking().Where(DocumentAccessFilter.For(scope));

    public async Task<DocumentDetails?> GetByIdAsync(
        Guid id,
        AccessScope scope,
        CancellationToken cancellationToken)
    {
        var row = await Visible(scope)
            // Güçlü tipli id doğrudan karşılaştırılır; x.Id.Value üzerinden
            // karşılaştırma value converter'ı atladığı için EF çeviremiyor.
            .Where(x => x.Id == new DocumentId(id))
            .Select(x => new
            {
                Id = x.Id.Value,
                x.Title,
                x.Status,
                x.CreatedAt,
                x.ArchivedAt,
                VersionCount = x.Versions.Count,
                x.ConcurrencyVersion,
                x.CurrentVersionNumber, x.CancelledAt, x.CancelledBy, x.CancellationReason
            })
            .SingleOrDefaultAsync(cancellationToken);

        return row is null
            ? null
            : new DocumentDetails(
                row.Id,
                row.Title,
                row.Status.ToString(),
                row.CreatedAt,
                row.ArchivedAt,
                row.VersionCount,
                row.ConcurrencyVersion,
                row.CurrentVersionNumber, row.CancelledAt, row.CancelledBy, row.CancellationReason);
    }

    public Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(
        Guid documentId,
        AccessScope scope,
        CancellationToken cancellationToken)
        => GetVersionContentAsync(documentId, null, scope, cancellationToken);

    public async Task<DocumentVersionContentDescriptor?> GetVersionContentAsync(
        Guid documentId,
        int? versionNumber,
        AccessScope scope,
        CancellationToken cancellationToken)
        => await Visible(scope)
            .Where(x => x.Id == new DocumentId(documentId))
            .SelectMany(x => x.Versions.Where(v => versionNumber == null
                ? v.VersionNumber == x.CurrentVersionNumber : v.VersionNumber == versionNumber))
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionContentDescriptor(
                v.VersionNumber,
                v.StorageKey,
                v.MimeType,
                v.SizeBytes,
                v.Sha256Hash,
                v.StorageVersionId))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<DocumentVersionSummary>> GetVersionsAsync(
        Guid documentId,
        AccessScope scope,
        CancellationToken cancellationToken)
        => await Visible(scope)
            .Where(x => x.Id == new DocumentId(documentId))
            .SelectMany(x => x.Versions)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionSummary(
                v.VersionNumber,
                v.MimeType,
                v.SizeBytes,
                v.Sha256Hash,
                v.CreatedBy,
                v.Reason,
                v.CreatedAt,
                v.CancelledAt,
                v.CancelledBy,
                v.CancellationReason))
            .ToListAsync(cancellationToken);

    public async Task<PagedResult<DocumentListItem>> GetPageAsync(
        PageRequest page,
        DocumentListFilter filter,
        DocumentListSort sort,
        AccessScope scope,
        CancellationToken cancellationToken)
    {
        var query = Visible(scope);
        if (!string.Equals(filter.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            query = query.Where(d => d.Status != DocumentStatus.Cancelled);
        if (filter.OwnerUnitId is { } owner)
        {
            var units = await _units.GetVisibleAsync(cancellationToken);
            var parent = units.FirstOrDefault(u => u.Id == owner);
            var ids = units.Where(u => parent is not null && u.Path.StartsWith(parent.Path, StringComparison.Ordinal)).Select(u => u.Id).ToArray();
            query = query.Where(d => d.OwnerUnitId != null && ids.Contains(d.OwnerUnitId.Value));
        }
        if (filter.DossierId is { } dossierId) query = query.Where(d => d.DossierId == dossierId);
        if (filter.Unfiled) query = query.Where(d => d.DossierId == null);
        if (filter.FilePlanCode is { Length: > 0 } code)
            query = query.Where(d => d.DossierId == null
                ? d.FilePlanCode != null && (d.FilePlanCode == code || d.FilePlanCode.StartsWith(code + "."))
                : _dbContext.Dossiers.Any(f => f.Id == d.DossierId && (f.FilePlanCode == code || f.FilePlanCode.StartsWith(code + "."))));

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(x => EF.Functions.ILike(x.Title, $"%{search}%"));
        }

        // Geçersiz durum adı sessizce yok sayılmaz; hiçbir kayıt eşleşmez.
        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = Enum.TryParse<DocumentStatus>(filter.Status, true, out var status)
                ? query.Where(x => x.Status == status)
                : query.Where(_ => false);
        }

        if (filter.CreatedFrom is not null)
        {
            query = query.Where(x => x.CreatedAt >= filter.CreatedFrom.Value);
        }

        if (filter.CreatedTo is not null)
        {
            query = query.Where(x => x.CreatedAt <= filter.CreatedTo.Value);
        }

        var totalCount = await query.LongCountAsync(cancellationToken);

        // Sayfalamanın kararlı olması için sıralama daima Id ile bağlanır.
        var ordered = sort switch
        {
            DocumentListSort.CreatedAtAscending =>
                query.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id),
            DocumentListSort.TitleAscending =>
                query.OrderBy(x => x.Title).ThenBy(x => x.Id),
            DocumentListSort.TitleDescending =>
                query.OrderByDescending(x => x.Title).ThenBy(x => x.Id),
            _ => query.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id)
        };

        var rows = await ordered
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new
            {
                Id = x.Id.Value,
                x.Title, x.OwnerUnitId, x.DossierId,
                x.Status,
                x.CreatedAt,
                VersionCount = x.Versions.Count
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(row => new DocumentListItem(
                row.Id,
                row.Title,
                row.Status.ToString(),
                row.CreatedAt,
                row.VersionCount, row.OwnerUnitId, row.DossierId))
            .ToList();

        return new PagedResult<DocumentListItem>(
            items,
            page.Page,
            page.PageSize,
            totalCount);
    }

    public async Task<DocumentIngestionDetails?> GetIngestionAsync(
        Guid documentId,
        Guid ingestionId,
        AccessScope scope,
        CancellationToken cancellationToken)
    {
        // Ingestion belgenin künyesini taşır; belge kapsam dışıysa hiç okunmaz.
        var visible = await Visible(scope)
            .AnyAsync(x => x.Id == new DocumentId(documentId), cancellationToken);

        if (!visible)
            return null;

        var row = await _dbContext.FileIngestions
            .AsNoTracking()
            // Güçlü tipli id'ler doğrudan karşılaştırılır; .Value üzerinden
            // karşılaştırma value converter'ı atladığı için EF çeviremiyor.
            .Where(x =>
                x.DocumentId == new DocumentId(documentId) &&
                x.Id == new DocumentFileIngestionId(ingestionId))
            .Select(x => new
            {
                Id = x.Id.Value,
                DocumentId = x.DocumentId.Value,
                x.OriginalFileName,
                x.ClientContentType,
                x.DetectedMimeType,
                x.DeclaredSizeBytes,
                x.StoredSizeBytes,
                x.Sha256Hash,
                x.Status,
                x.SecurityScanner,
                x.SecurityScannedAt,
                x.RejectionCode,
                x.RejectionDetail,
                x.OriginalStorageKey,
                x.OriginalStoredAt,
                x.CreatedAt,
                x.StagedAt
            })
            .SingleOrDefaultAsync(cancellationToken);

        return row is null
            ? null
            : new DocumentIngestionDetails(
                row.Id,
                row.DocumentId,
                row.OriginalFileName,
                row.ClientContentType,
                row.DetectedMimeType,
                row.DeclaredSizeBytes,
                row.StoredSizeBytes,
                row.Sha256Hash,
                row.Status.ToString(),
                row.SecurityScanner,
                row.SecurityScannedAt,
                row.RejectionCode,
                row.RejectionDetail,
                row.OriginalStorageKey,
                row.OriginalStoredAt,
                row.CreatedAt,
                row.StagedAt);
    }

}
