using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;
namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class DocumentPhysicalFiling(PhysicalArchiveDbContext db, IArchiveFilingCatalog documents,
    PhysicalFolderAccess access, ICurrentUserPermissions permissions, TimeProvider time) : IDocumentPhysicalFiling
{
    public async Task<IReadOnlyList<DocumentPhysicalFolder>> GetAsync(Guid id, CancellationToken ct)
    {
        var document = await documents.GetDocumentAsync(id, ct);
        if (document is null) return [];
        return await db.Folders.AsNoTracking().Where(f => f.OwnerUnitId == document.OwnerUnitId && f.Documents.Any(d => d.DocumentId == id))
            .OrderBy(f => f.Id).Select(f => new DocumentPhysicalFolder(f.Id, f.Barcode, f.Title, f.FilePlanCode)).ToListAsync(ct);
    }

    public async Task<Result> ReplaceAsync(Guid id, IReadOnlyList<Guid> expectedIds, IReadOnlyList<Guid> ids, CancellationToken ct)
    {
        if (await documents.GetDocumentAsync(id, ct) is null)
            return Result.Failure(Error.NotFound("filing.document_missing", "Belge bulunamadı."));
        var current = await db.Folders.Include(f => f.Documents).Where(f => f.Documents.Any(d => d.DocumentId == id)).ToListAsync(ct);
        if (!current.Select(f => f.Id).ToHashSet().SetEquals(expectedIds))
            return Result.Failure(Error.Conflict("filing.changed", "Fiziksel bağlantılar değişmiş. Sayfayı yenileyin."));
        if (current.Count == 0 && ids.Count == 0) return Result.Success();
        if (!await permissions.HasAllPermissionsAsync(ct) && !(await permissions.GetAsync(ct)).Contains("physical-archive.manage", StringComparer.OrdinalIgnoreCase))
            return Result.Failure(new Error("filing.physical_forbidden", "Fiziksel dosyalama için yönetim yetkisi gerekir.", ErrorType.Forbidden));
        var target = await db.Folders.Include(f => f.Documents).Where(f => ids.Contains(f.Id)).ToListAsync(ct);
        if (target.Count != ids.Distinct().Count())
            return Result.Failure(Error.NotFound("filing.folder_missing", "Hedef fiziksel klasör bulunamadı."));
        foreach (var folder in current.Concat(target).DistinctBy(f => f.Id))
            if (!await access.CanModifyAsync(folder, ct))
                return Result.Failure(Error.NotFound("filing.folder_missing", "Yetkili olduğunuz fiziksel klasör bulunamadı."));
        foreach (var folder in target)
            if (!await access.CanLinkAsync(folder, id, ct))
                return Result.Failure(Error.Validation("filing.folder_mismatch", "Fiziksel klasör belgenin birimi, dijital dosyası ve SDP konusu ile eşleşmelidir."));
        try
        {
            foreach (var folder in current.Where(f => !ids.Contains(f.Id))) folder.UnlinkDocument(id);
            foreach (var folder in target) folder.LinkDocument(id, time.GetUtcNow());
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("filing.folder_closed", ex.Message)); }
    }
}
