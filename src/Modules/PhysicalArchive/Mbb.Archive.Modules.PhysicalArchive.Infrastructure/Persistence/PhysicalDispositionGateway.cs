using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class PhysicalDispositionGateway(PhysicalArchiveDbContext db, IDocumentVisibility visibility) : IPhysicalDispositionGateway
{
    public async Task<Result> RecordAsync(Guid documentId, Guid processId, string actor, string protocolReference,
        Guid evidenceDocumentId, DateTimeOffset executedAt, CancellationToken ct)
    {
        if (!(await visibility.FilterAsync([documentId, evidenceDocumentId], ct)).IsSupersetOf(new[] { documentId, evidenceDocumentId }))
            return Result.Failure(Error.NotFound("physical_archive.document_not_found", "Belge veya fiziksel imha kanıtı bulunamadı."));
        var folders = await db.Folders.Include(x => x.Documents).Where(x => x.Documents.Any(d => d.DocumentId == documentId)).ToArrayAsync(ct);
        if (folders.Length == 0) return Result.Failure(Error.Conflict("physical_archive.no_original", "Belgenin fiziksel klasör bağlantısı bulunamadı; fiziksel imha kaydedilemez."));
        if (await db.Loans.AnyAsync(x => folders.Select(f => f.Id).Contains(x.FolderId) && x.ReturnedAt == null, ct))
            return Result.Failure(Error.Conflict("physical_archive.active_loan", "Fiziksel belge ödünçte; imha kaydı öncesinde iade işlemi tamamlanmalıdır."));
        if (folders.All(x => x.Documents.Single(d => d.DocumentId == documentId)
            .MatchesDisposition(processId, actor, protocolReference, evidenceDocumentId, executedAt))) return Result.Success();
        try
        {
            foreach (var folder in folders) folder.RecordPhysicalDisposition(documentId, processId, actor, protocolReference, evidenceDocumentId, executedAt);
            db.Enqueue(new PhysicalDispositionRecordedIntegrationEvent(Guid.CreateVersion7(), processId, documentId,
                folders.Select(x => x.Id).ToArray(), actor, protocolReference, evidenceDocumentId, executedAt, DateTimeOffset.UtcNow));
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException exception) { return Result.Failure(Error.Conflict("physical_archive.disposition_conflict", exception.Message)); }
        catch (ConcurrencyConflictException) { return Result.Failure(Error.Conflict("physical_archive.changed", "Fiziksel klasör aynı anda değişmiş; güncel durumu kontrol edip tekrar deneyin.")); }
    }
}
