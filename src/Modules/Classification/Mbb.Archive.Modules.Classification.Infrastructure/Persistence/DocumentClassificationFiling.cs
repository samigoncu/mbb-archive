using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Documents.Contracts;
namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;

internal sealed class DocumentClassificationFiling(ClassificationDbContext db, IArchiveFilingCatalog filing,
    IArchiveUnitDirectory units, IUnitFilePlanPolicy unitPlans, TimeProvider time) : IDocumentClassificationFiling
{
    public async Task<PrimaryClassification?> GetPrimaryAsync(Guid id, CancellationToken ct)
    {
        // Contract callers authorize requests; background projections also need the current primary.
        var row = await db.DocumentClassifications.AsNoTracking().Where(x => x.DocumentId == id && x.IsPrimary)
            .OrderByDescending(x => x.ClassifiedAt).FirstOrDefaultAsync(ct);
        if (row is null) return null;
        var plan = await db.FilePlans.AsNoTracking().Include(p => p.Items).SingleOrDefaultAsync(p => p.Id == row.FilePlanId, ct);
        var item = plan?.Items.SingleOrDefault(i => i.Id == row.FilePlanItemId);
        return item is null ? null : new(row.FilePlanId.Value, row.FilePlanItemId.Value, item.Code, item.Title, plan!.Code, plan.Name);
    }

    public async Task<Result> ReplacePrimaryAsync(Guid id, Guid planId, Guid itemId, CancellationToken ct)
    {
        var document = await filing.GetDocumentAsync(id, ct);
        if (document?.OwnerUnitId is not { } owner || await units.ResolveWritableAsync(owner, "documents.manage.all", ct) is null)
            return Result.Failure(Error.NotFound("filing.document_missing", "Yetkili olduğunuz belge bulunamadı."));
        var plan = await db.FilePlans.Include(p => p.Items).SingleOrDefaultAsync(p => p.Id == new FilePlanId(planId), ct);
        var item = plan?.Items.SingleOrDefault(i => i.Id == new FilePlanItemId(itemId));
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
        if (plan is null || item is null || !plan.IsActive || !item.IsActive || !item.IsSelectable
            || plan.EffectiveFrom > today || plan.EffectiveTo < today || document.FilePlanCode != item.Code
            || !await unitPlans.IsAssignedAsync(owner, planId, itemId, ct))
            return Result.Failure(Error.Validation("filing.invalid_plan", "Birime atanmış, yürürlükteki ve dosyayla eşleşen SDP konusu seçilmelidir."));
        var rows = await db.DocumentClassifications.Where(x => x.DocumentId == id).ToListAsync(ct);
        var selected = rows.SingleOrDefault(x => x.FilePlanItemId == item.Id);
        foreach (var row in rows) row.SetPrimary(row == selected);
        if (selected is null)
            db.DocumentClassifications.Add(DocumentClassification.Create(id, plan.Id, item.Id, true, time.GetUtcNow()));
        db.Enqueue(new DocumentClassifiedIntegrationEvent(Guid.CreateVersion7(), id, planId, plan.Code, plan.Name,
            itemId, item.Code, item.Title, true, time.GetUtcNow()));
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
