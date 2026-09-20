using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
namespace Mbb.Archive.Modules.Documents.Application.Dossiers;

public sealed class DossierHandlers(IDossierRepository dossiers, IDocumentRepository documents,
    IArchiveUnitDirectory units, IFilePlanEntryCatalog plans, IUnitOfWork<DocumentsBoundary> uow,
    IOutbox<DocumentsBoundary> outbox, TimeProvider time, IUnitFilePlanPolicy unitPlans)
{
    public async Task<Result<Guid>> CreateAsync(CreateDossierRequest request, CancellationToken ct)
    {
        var unit = await units.ResolveWritableAsync(request.OwnerUnitId, "documents.manage.all", ct);
        if (unit is null) return Result<Guid>.Failure(Error.Validation("dossiers.unit_required", "Yetkili olduğunuz aktif birim seçilmelidir."));
        var entry = await plans.GetSelectableAsync(request.FilePlanId, request.FilePlanItemId,
            DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime), ct);
        if (entry is null) return Result<Guid>.Failure(Error.Validation("dossiers.invalid_plan", "Yürürlükteki dosya planından seçilebilir bir konu seçilmelidir."));
        if (!await unitPlans.IsAssignedAsync(unit.Id, entry.PlanId, entry.ItemId, ct))
            return Result<Guid>.Failure(Error.Validation("dossiers.unit_plan_required", "Bu SDP başlığı seçili birime atanmamış. Birim yönetiminden eşleştirme yapın."));
        try
        {
            var dossier = DigitalDossier.Create(unit.Id, entry.PlanId, entry.ItemId, entry.Version,
                entry.Code, entry.Title, request.Title, request.Year, time.GetUtcNow());
            await dossiers.AddAsync(dossier, ct);
            outbox.Enqueue(new DossierFiledIntegrationEvent(Guid.CreateVersion7(), dossier.Id, null, unit.Id, time.GetUtcNow()));
            await uow.SaveChangesAsync(ct);
            return Result<Guid>.Success(dossier.Id);
        }
        catch (DomainRuleViolationException ex) { return Result<Guid>.Failure(Error.Validation("dossiers.invalid", ex.Message)); }
    }

    public async Task<Result> RenameAsync(Guid id, RenameDossierRequest request, CancellationToken ct)
    {
        var dossier = await dossiers.GetAsync(id, ct);
        if (dossier is null || await units.ResolveWritableAsync(dossier.OwnerUnitId, "documents.manage.all", ct) is null)
            return Result.Failure(Error.NotFound("dossiers.not_found", "Dijital dosya bulunamadı."));
        if (dossier.Title != request.ExpectedTitle)
            return Result.Failure(Error.Conflict("dossiers.changed", "Klasör adı değişmiş. Sayfayı yenileyin."));
        try {
            dossier.Rename(request.Title);
            return await dossiers.RenameAsync(id, request.ExpectedTitle, dossier.Title, ct) ? Result.Success()
                : Result.Failure(Error.Conflict("dossiers.changed", "Klasör adı değişmiş. Sayfayı yenileyin."));
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Validation("dossiers.invalid", ex.Message)); }
    }

    public async Task<Result> FileAsync(Guid dossierId, Guid documentId, CancellationToken ct)
    {
        var dossier = await dossiers.GetAsync(dossierId, ct);
        if (dossier is null || await units.ResolveWritableAsync(dossier.OwnerUnitId, "documents.manage.all", ct) is null)
            return Result.Failure(Error.NotFound("dossiers.not_found", "Dijital dosya bulunamadı."));
        if (!await unitPlans.IsAssignedAsync(dossier.OwnerUnitId, dossier.FilePlanId, dossier.FilePlanItemId, ct))
            return Result.Failure(Error.Validation("dossiers.unit_plan_required", "Dijital dosyanın SDP konusu birime atanmamış."));
        var document = await documents.GetByIdAsync(new DocumentId(documentId), ct);
        if (document is null || document.OwnerUnitId != dossier.OwnerUnitId)
            return Result.Failure(Error.NotFound("documents.not_found", "Aynı birime ait belge bulunamadı."));
        try
        {
            document.FileIn(dossier);
            outbox.Enqueue(new DossierFiledIntegrationEvent(Guid.CreateVersion7(), dossier.Id, documentId, dossier.OwnerUnitId, time.GetUtcNow()));
            await uow.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("dossiers.classification_conflict", ex.Message)); }
    }
}
