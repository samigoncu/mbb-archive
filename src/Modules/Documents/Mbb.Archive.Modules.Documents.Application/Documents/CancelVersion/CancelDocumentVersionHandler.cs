using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Application.Documents.CancelVersion;

public sealed record CancelDocumentVersion(long ExpectedVersion, Guid RequestId, string Reason, int? ReplacementVersionNumber);

public sealed class CancelDocumentVersionHandler(IDocumentRepository documents, IArchiveFilingCatalog catalog,
    IArchiveUnitDirectory units, ICurrentUserPermissions permissions, IUnitOfWork<DocumentsBoundary> uow,
    IOutbox<DocumentsBoundary> outbox, TimeProvider time)
{
    public async Task<Result> Handle(Guid id, int number, CancelDocumentVersion request, CancellationToken ct)
    {
        if (!await permissions.HasAllPermissionsAsync(ct) && !(await permissions.GetAsync(ct)).Contains("documents.versions.cancel"))
            return Result.Failure(new Error("documents.version_cancel_forbidden", "Sürüm iptal yetkiniz yok.", ErrorType.Forbidden));
        if (number <= 0 || request.ExpectedVersion <= 0 || request.RequestId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1000)
            return Result.Failure(Error.Validation("documents.invalid_cancellation", "Geçerli işlem bilgileri ve en fazla 1000 karakterlik gerekçe gerekir."));
        var visible = await catalog.GetDocumentAsync(id, ct);
        if (visible?.OwnerUnitId is not { } owner || await units.ResolveWritableAsync(owner, "documents.manage.all", ct) is null)
            return Result.Failure(Error.NotFound("documents.not_found", "İptal yetkiniz olan belge bulunamadı."));
        var doc = await documents.GetByIdAsync(new DocumentId(id), ct);
        if (doc is null) return Result.Failure(Error.NotFound("documents.not_found", "Belge bulunamadı."));
        try
        {
            var previous = doc.CurrentVersionNumber;
            var now = time.GetUtcNow();
            if (!doc.CancelVersion(number, request.ReplacementVersionNumber, request.ExpectedVersion, request.RequestId, permissions.Subject, request.Reason, now))
                return Result.Success();
            var version = doc.Versions.Single(v => v.VersionNumber == number);
            outbox.Enqueue(new DocumentVersionCancelledIntegrationEvent(Guid.CreateVersion7(), id, number, previous,
                doc.CurrentVersionNumber, version.Sha256Hash, request.Reason.Trim(), permissions.Subject, request.RequestId, now));
            await uow.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("documents.version_cancel_conflict", ex.Message)); }
        catch (ConcurrencyConflictException) { return Result.Failure(Error.Conflict("documents.version_cancel_conflict", "Belge değişmiş. Sayfayı yenileyip yeniden deneyin.")); }
    }
}
