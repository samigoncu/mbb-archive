using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Archive.Application.Abstractions;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Archive.Application.Records.Get;
using Mbb.Archive.Modules.Archive.Application.Records.List;
using Mbb.Archive.Modules.Archive.Domain.Records;
namespace Mbb.Archive.Modules.Archive.Infrastructure.Persistence;

internal sealed class EfArchiveRepository : IArchiveRecordRepository, IArchiveQueries
{
    private readonly ArchiveDbContext _db; public EfArchiveRepository(ArchiveDbContext db) { _db = db; }
    public async Task AddAsync(ArchiveRecord r, CancellationToken ct) => await _db.Records.AddAsync(r, ct); public Task<ArchiveRecord?> GetAsync(ArchiveRecordId id, CancellationToken ct) => _db.Records.SingleOrDefaultAsync(x => x.Id == id, ct); public Task<ArchiveRecord?> GetByDocumentVersionAsync(Guid id, CancellationToken ct) => _db.Records.SingleOrDefaultAsync(x => x.DocumentVersionId == id, ct); public Task<ArchiveRecord?> GetByDocumentIdAsync(Guid id, CancellationToken ct) => _db.Records.OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(x => x.DocumentId == id, ct); public Task<ArchiveRecordDetails?> GetAsync(Guid id, AccessScope scope, CancellationToken ct) => _db.Records.AsNoTracking().Where(ArchiveRecordAccessFilter.For(scope)).Where(x => x.Id == new ArchiveRecordId(id)).Select(x => new ArchiveRecordDetails(x.Id.Value, x.DocumentId, x.DocumentVersionId, x.Status.ToString(), x.OriginalStorageKey, x.Sha256Hash, x.MimeType, x.SizeBytes, x.ClassificationCode, x.RetentionRuleCode, x.CreatedAt, x.DeclaredAt)).SingleOrDefaultAsync(ct);

    /// <summary>
    /// Bilinmeyen durum değeri hata değil boş sonuçtur; eski bağlantılar
    /// listeyi kırmaz. Sıralama beyan bekleyenleri öne alır.
    /// </summary>
    public async Task<PagedResult<ArchiveRecordListItem>> GetPageAsync(
        PageRequest page,
        string? status,
        Guid? documentId,
        AccessScope scope,
        CancellationToken ct)
    {
        // Kapsam süzgeci ilk sırada: durum süzgeci ya da sayfalama ne olursa
        // olsun kullanıcının göremeyeceği kayıt sorgudan hiç çıkmaz.
        var query = _db.Records.AsNoTracking().Where(ArchiveRecordAccessFilter.For(scope));

        // Desen eşleştirme, nullable açmayı sorgu ifadesinin dışına taşır:
        // `.Value` sorgu içinde kaldığında güçlü tipli id karşılaştırmasıyla
        // karışıyor ve mimari denetimi gereksiz yere uyarıyordu.
        if (documentId is { } id)
        {
            query = query.Where(x => x.DocumentId == id);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = Enum.TryParse<ArchiveRecordStatus>(status, true, out var parsed)
                ? query.Where(x => x.Status == parsed)
                : query.Where(_ => false);
        }

        var total = await query.LongCountAsync(ct);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .Select(x => new ArchiveRecordListItem(
                x.Id.Value,
                x.DocumentId,
                x.DocumentVersionId,
                x.Status.ToString(),
                x.Sha256Hash,
                x.MimeType,
                x.SizeBytes,
                x.ClassificationCode,
                x.RetentionRuleCode,
                x.CreatedAt,
                x.DeclaredAt))
            .ToListAsync(ct);

        return new PagedResult<ArchiveRecordListItem>(
            items,
            page.Page,
            page.PageSize,
            total);
    }
}
