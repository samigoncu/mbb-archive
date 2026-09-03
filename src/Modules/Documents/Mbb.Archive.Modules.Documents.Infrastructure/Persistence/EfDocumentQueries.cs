using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class EfDocumentQueries : IDocumentQueries
{
    private readonly DocumentsDbContext _dbContext;

    public EfDocumentQueries(DocumentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DocumentDetails?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var row = await _dbContext.Documents
            .AsNoTracking()
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
                VersionCount = x.Versions.Count
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
                row.VersionCount);
    }

    public async Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(
        Guid documentId,
        CancellationToken cancellationToken)
        => await _dbContext.Documents
            .AsNoTracking()
            .Where(x => x.Id == new DocumentId(documentId))
            .SelectMany(x => x.Versions)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionContentDescriptor(
                v.VersionNumber,
                v.StorageKey,
                v.MimeType,
                v.SizeBytes,
                v.Sha256Hash))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PagedResult<DocumentListItem>> GetPageAsync(
        PageRequest page,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Documents
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt);

        var totalCount = await query.LongCountAsync(cancellationToken);

        var rows = await query
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new
            {
                Id = x.Id.Value,
                x.Title,
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
                row.VersionCount))
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
        CancellationToken cancellationToken)
    {
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
