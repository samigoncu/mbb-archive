using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;
namespace Mbb.Archive.Modules.Documents.Application.Dossiers;

public interface IDocumentFilingTransaction { Task<Result> ExecuteAsync(Func<Task<Result>> action, CancellationToken ct); }
public sealed record ChangeDocumentFiling(long ExpectedVersion, Guid? DossierId, Guid FilePlanId, Guid FilePlanItemId,
    Guid[] ExpectedFolderIds, Guid[] FolderIds, string Reason);
public sealed record DocumentFilingState(Guid OwnerUnitId, long Version, Guid? DossierId, string? FilePlanCode,
    PrimaryClassification? Classification, IReadOnlyList<DocumentPhysicalFolder> Folders);

public sealed class DocumentFilingHandler(IDocumentRepository documents, IDossierRepository dossiers,
    IArchiveFilingCatalog catalog, IArchiveUnitDirectory units, IFilePlanEntryCatalog plans, IUnitFilePlanPolicy unitPlans,
    IDocumentClassificationFiling classification, IDocumentPhysicalFiling physical, IDocumentFilingTransaction transaction,
    IUnitOfWork<DocumentsBoundary> uow, IOutbox<DocumentsBoundary> outbox, ICurrentUserPermissions permissions, TimeProvider time)
{
    private async Task<Document?> WritableAsync(Guid id, CancellationToken ct)
    {
        var visible = await catalog.GetDocumentAsync(id, ct);
        if (visible?.OwnerUnitId is not { } owner || await units.ResolveWritableAsync(owner, "documents.manage.all", ct) is null) return null;
        return await documents.GetByIdAsync(new DocumentId(id), ct);
    }
    public async Task<Result<DocumentFilingState>> GetAsync(Guid id, CancellationToken ct)
    {
        var doc = await WritableAsync(id, ct);
        if (doc is null) return Result<DocumentFilingState>.Failure(Missing());
        var current = await classification.GetPrimaryAsync(id, ct);
        var folders = await physical.GetAsync(id, ct);
        return Result<DocumentFilingState>.Success(new(doc.OwnerUnitId!.Value, doc.ConcurrencyVersion, doc.DossierId, doc.FilePlanCode, current, folders));
    }
    public Task<Result> ChangeAsync(Guid id, ChangeDocumentFiling request, CancellationToken ct)
        => transaction.ExecuteAsync(async () =>
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 1000 || request.FolderIds is null || request.ExpectedFolderIds is null
            || request.FolderIds.Length > 100 || request.ExpectedFolderIds.Length > 100)
            return Result.Failure(Error.Validation("filing.invalid_request", "Değişiklik gerekçesi (en fazla 1000 karakter) ve geçerli klasör seçimi gerekir."));
        var doc = await WritableAsync(id, ct);
        if (doc is null) return Result.Failure(Missing());
        var entry = await plans.GetSelectableAsync(request.FilePlanId, request.FilePlanItemId, DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime), ct);
        if (entry is null || !await unitPlans.IsAssignedAsync(doc.OwnerUnitId!.Value, entry.PlanId, entry.ItemId, ct))
            return Result.Failure(Error.Validation("filing.invalid_plan", "Belgenin birimine atanmış, yürürlükteki SDP konusu seçilmelidir."));
        var dossier = request.DossierId is { } target ? await dossiers.GetAsync(target, ct) : null;
        if (request.DossierId is not null && (dossier is null || dossier.FilePlanId != entry.PlanId || dossier.FilePlanItemId != entry.ItemId))
            return Result.Failure(Error.Validation("filing.invalid_dossier", "Dijital dosyanın SDP konusu seçiminizle eşleşmelidir."));
        var oldDossier = doc.DossierId; var oldCode = doc.FilePlanCode;
        try { doc.Refile(dossier, entry.Code, request.ExpectedVersion); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("filing.conflict", ex.Message)); }
        await uow.SaveChangesAsync(ct);
        var classified = await classification.ReplacePrimaryAsync(id, entry.PlanId, entry.ItemId, ct);
        if (classified.IsFailure) return classified;
        var linked = await physical.ReplaceAsync(id, request.ExpectedFolderIds, request.FolderIds, ct);
        if (linked.IsFailure) return linked;
        outbox.Enqueue(new DocumentFilingChangedIntegrationEvent(Guid.CreateVersion7(), id, doc.Title, oldDossier, doc.DossierId,
            oldCode, doc.FilePlanCode!, request.ExpectedFolderIds, request.FolderIds, request.Reason.Trim(), permissions.Subject, time.GetUtcNow()));
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }, ct);
    private static Error Missing() => Error.NotFound("filing.document_missing", "Dosyalama yetkiniz olan belge bulunamadı.");
}
