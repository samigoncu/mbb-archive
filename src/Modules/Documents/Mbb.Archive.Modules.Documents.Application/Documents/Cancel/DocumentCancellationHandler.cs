using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.Application.Documents.Cancel;

public sealed record ChangeDocumentCancellation(long ExpectedVersion, Guid RequestId, string Reason);

public sealed class DocumentCancellationHandler(IDocumentRepository documents, ICurrentUserScope scopes,
    IArchiveUnitDirectory units, ICurrentUserPermissions permissions, IUnitOfWork<DocumentsBoundary> uow,
    IOutbox<DocumentsBoundary> outbox, TimeProvider time)
{
    public async Task<Result> Handle(Guid id, bool cancel, ChangeDocumentCancellation request, CancellationToken ct)
    {
        if (!await permissions.HasAllPermissionsAsync(ct) && !(await permissions.GetAsync(ct)).Contains("documents.cancel"))
            return Result.Failure(new Error("documents.cancel_forbidden", "Belge iptal ve geri alma yetkiniz yok.", ErrorType.Forbidden));
        if (request.ExpectedVersion <= 0 || request.RequestId == Guid.Empty || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1000)
            return Result.Failure(Error.Validation("documents.invalid_cancellation", "Geçerli işlem bilgileri ve en fazla 1000 karakterlik gerekçe gerekir."));
        var doc = await documents.GetByIdAsync(new DocumentId(id), ct);
        var scope = await scopes.GetAsync(ct);
        if (doc is null || !DocumentAccessFilter.Allows(scope, id, doc.OwnerUnitPath, doc.FilePlanCode)
            || doc.OwnerUnitId is not { } owner || await units.ResolveWritableAsync(owner, "documents.manage.all", ct) is null)
            return Result.Failure(Error.NotFound("documents.not_found", "İşlem yetkiniz olan belge bulunamadı."));
        try
        {
            var now = time.GetUtcNow();
            if (!doc.SetCancellation(cancel, request.ExpectedVersion, request.RequestId, permissions.Subject, request.Reason, now)) return Result.Success();
            outbox.Enqueue(new DocumentCancellationChangedIntegrationEvent(Guid.CreateVersion7(), id, cancel,
                request.Reason.Trim(), permissions.Subject, request.RequestId, now));
            await uow.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("documents.cancel_conflict", ex.Message)); }
        catch (ConcurrencyConflictException) { return Result.Failure(Error.Conflict("documents.cancel_conflict", "Belge değişmiş. Sayfayı yenileyip yeniden deneyin.")); }
    }
}
