using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;
namespace Mbb.Archive.Modules.Organization.Application.Units;

public sealed record UnitPlanSelection(Guid PlanId, Guid ItemId);
public sealed record SaveUnitPlansRequest(long Revision, IReadOnlyList<UnitPlanSelection> Items);
public sealed record UnitPlanDetails(Guid UnitId, long Revision, IReadOnlyList<UnitFilePlanEntry> Items);

public sealed class UnitAdministrationHandlers(IOrganizationRepository repository, IOrganizationQueries queries,
    IUnitPlanAssignments assignments, IFilePlanEntryCatalog catalog, IUnitOfWork<OrganizationBoundary> uow,
    IEnumerable<IOrganizationUnitUsage> usage, TimeProvider time)
{
    public async Task<Result<UnitPlanDetails>> GetPlansAsync(Guid id, CancellationToken ct)
    {
        var unit = await repository.GetUnitAsync(new(id), ct);
        if (unit is null) return Result<UnitPlanDetails>.Failure(OrganizationErrors.UnitNotFound);
        var items = await assignments.GetAsync(unit.Id, ct);
        return Result<UnitPlanDetails>.Success(new(id, unit.ConcurrencyVersion,
            items.Select(x => new UnitFilePlanEntry(id, x.PlanId, x.ItemId, x.Code, x.Title, x.Version)).ToArray()));
    }

    public async Task<Result<long>> SavePlansAsync(Guid id, SaveUnitPlansRequest request, CancellationToken ct)
    {
        var unit = await repository.GetUnitAsync(new(id), ct);
        if (unit is null) return Result<long>.Failure(OrganizationErrors.UnitNotFound);
        if (!unit.IsActive) return Result<long>.Failure(OrganizationErrors.Invalid("Pasif birimin SDP eşleştirmesi değiştirilemez."));
        if (unit.ConcurrencyVersion != request.Revision)
            return Result<long>.Failure(OrganizationErrors.Conflict("Birim başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin."));
        if (request.Items is null || request.Items.Count > 5000)
            return Result<long>.Failure(OrganizationErrors.Invalid("SDP seçim listesi geçersiz."));
        var existing = await assignments.GetAsync(unit.Id, ct);
        var next = new List<UnitFilePlanAssignment>();
        foreach (var item in request.Items.Distinct())
        {
            var retained = existing.FirstOrDefault(x => x.PlanId == item.PlanId && x.ItemId == item.ItemId);
            // Existing historical assignments can remain; newly added items must be current and selectable.
            if (retained is not null) { next.Add(retained); continue; }
            var entry = await catalog.GetSelectableAsync(item.PlanId, item.ItemId, DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime), ct);
            if (entry is null) return Result<long>.Failure(OrganizationErrors.Invalid("Seçimlerde yürürlükte olmayan veya seçilemeyen bir SDP başlığı var."));
            next.Add(new(unit.Id, entry.PlanId, entry.ItemId, entry.Code, entry.Title, entry.Version));
        }
        await assignments.ReplaceAsync(unit.Id, next, ct);
        unit.ChangeFilePlanAssignments();
        await uow.SaveChangesAsync(ct);
        return Result<long>.Success(unit.ConcurrencyVersion);
    }

    public async Task<Result> RemoveAsync(Guid id, CancellationToken ct)
    {
        var unit = await repository.GetUnitAsync(new(id), ct);
        if (unit is null) return Result.Failure(OrganizationErrors.UnitNotFound);
        var descendants = await repository.GetDescendantsAsync(unit.Path, ct);
        if (descendants.Any(x => x.Id != unit.Id && !x.IsRemoved))
            return Result.Failure(OrganizationErrors.Conflict("Alt birimleri bulunan birim silinemez. Önce alt birimleri taşıyın veya kaldırın."));
        if ((await queries.GetUnitMembersAsync(id, ct)).Count > 0)
            return Result.Failure(OrganizationErrors.Conflict("Üyesi bulunan birim silinemez. Üyelikleri kaldırın veya birimi pasifleştirin."));
        foreach (var contributor in usage)
            if (await contributor.HasReferencesAsync(id, ct))
                return Result.Failure(OrganizationErrors.Conflict("Belge veya dosyası bulunan birim silinemez. Arşiv bağlantılarını korumak için pasifleştirin."));
        await assignments.ReplaceAsync(unit.Id, [], ct);
        // Keep the identity as a tombstone so a concurrent external reference cannot become orphaned.
        unit.Remove();
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
