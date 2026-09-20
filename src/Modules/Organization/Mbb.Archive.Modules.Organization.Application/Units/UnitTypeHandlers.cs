using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Application.Units;

public interface IUnitTypeStore
{
    Task<IReadOnlyList<OrganizationUnitTypeDefinition>> ListAsync(CancellationToken ct);
    Task<OrganizationUnitTypeDefinition?> FindAsync(string code, CancellationToken ct);
    Task AddAsync(OrganizationUnitTypeDefinition definition, CancellationToken ct);
    void Remove(OrganizationUnitTypeDefinition definition);

    /// <summary>Bu seviyeye bağlı birim sayısı; silme engelini belirler.</summary>
    Task<int> UnitCountAsync(string code, CancellationToken ct);
}

public sealed record UnitTypeView(
    string Code, string Name, int Level, bool CanHoldMembers, bool IsActive, bool IsBuiltIn,
    /// <summary>Bu seviyede tanımlı birim sayısı.</summary>
    int UnitCount,
    /// <summary>Bunun altına açılabilecek seviyeler; arayüz seçimi buna göre süzer.</summary>
    IReadOnlyList<string> AllowedChildCodes);

public sealed record SaveUnitType(string Name, int Level, bool CanHoldMembers);

/// <summary>
/// Teşkilat seviyelerini yönetir.
/// </summary>
/// <remarks>
/// Seviye kodu değişmezdir: birim kayıtları koda bağlıdır ve kodu değiştirmek
/// o birimleri seviyesiz bırakırdı. Ad, derinlik ve personel taşıyabilirliği
/// serbestçe düzenlenir.
/// </remarks>
public sealed class UnitTypeHandlers(IUnitTypeStore store, IUnitOfWork<OrganizationBoundary> uow)
{
    public async Task<IReadOnlyList<UnitTypeView>> ListAsync(CancellationToken ct)
    {
        var definitions = (await store.ListAsync(ct)).OrderBy(x => x.Level).ThenBy(x => x.Name).ToArray();
        var views = new List<UnitTypeView>(definitions.Length);

        foreach (var definition in definitions)
        {
            views.Add(new UnitTypeView(
                definition.Code, definition.Name, definition.Level, definition.CanHoldMembers,
                definition.IsActive, definition.IsBuiltIn,
                await store.UnitCountAsync(definition.Code, ct),
                definitions
                    .Where(child => child.IsActive && child.CanNestUnder(definition))
                    .Select(child => child.Code)
                    .ToArray()));
        }

        return views;
    }

    public async Task<Result<UnitTypeView>> CreateAsync(string code, SaveUnitType request, CancellationToken ct)
    {
        if (await store.FindAsync(code.Trim(), ct) is not null)
        {
            return Result<UnitTypeView>.Failure(Error.Conflict(
                "organization.unit_type_exists", "Bu kodla bir seviye zaten tanımlı."));
        }

        OrganizationUnitTypeDefinition definition;
        try
        {
            definition = OrganizationUnitTypeDefinition.Create(
                code, request.Name, request.Level, request.CanHoldMembers);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<UnitTypeView>.Failure(Invalid(exception));
        }

        await store.AddAsync(definition, ct);
        await uow.SaveChangesAsync(ct);
        return Result<UnitTypeView>.Success(View(definition, 0));
    }

    public async Task<Result<UnitTypeView>> UpdateAsync(string code, SaveUnitType request, CancellationToken ct)
    {
        var definition = await store.FindAsync(code, ct);
        if (definition is null) return Result<UnitTypeView>.Failure(NotFound);

        try { definition.Update(request.Name, request.Level, request.CanHoldMembers); }
        catch (DomainRuleViolationException exception) { return Result<UnitTypeView>.Failure(Invalid(exception)); }

        await uow.SaveChangesAsync(ct);
        return Result<UnitTypeView>.Success(View(definition, await store.UnitCountAsync(code, ct)));
    }

    public async Task<Result> SetActiveAsync(string code, bool isActive, CancellationToken ct)
    {
        var definition = await store.FindAsync(code, ct);
        if (definition is null) return Result.Failure(NotFound);

        try { definition.SetActive(isActive); }
        catch (DomainRuleViolationException exception) { return Result.Failure(Invalid(exception)); }

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    /// <summary>
    /// Seviyeyi siler. Kullanımdaysa silinmez; pasife alma önerilir.
    /// </summary>
    /// <remarks>
    /// Silme, o seviyedeki birimleri sessizce seviyesiz bırakırdı. Teşkilat
    /// şeması değişmişse doğru davranış seviyeyi pasife almaktır: geçmiş
    /// kayıtlar okunur kalır, yeni birim o seviyede açılamaz.
    /// </remarks>
    public async Task<Result> DeleteAsync(string code, CancellationToken ct)
    {
        var definition = await store.FindAsync(code, ct);
        if (definition is null) return Result.Failure(NotFound);

        if (definition.IsBuiltIn)
        {
            return Result.Failure(Error.Conflict("organization.unit_type_built_in",
                "Kurulumla gelen seviye silinemez; kullanmıyorsanız pasife alın."));
        }

        var used = await store.UnitCountAsync(code, ct);
        if (used > 0)
        {
            return Result.Failure(Error.Conflict("organization.unit_type_in_use",
                $"Bu seviyede {used} birim tanımlı. Önce birimlerin seviyesini değiştirin ya da seviyeyi pasife alın."));
        }

        store.Remove(definition);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static UnitTypeView View(OrganizationUnitTypeDefinition definition, int unitCount) => new(
        definition.Code, definition.Name, definition.Level, definition.CanHoldMembers,
        definition.IsActive, definition.IsBuiltIn, unitCount, []);

    private static Error NotFound
        => Error.NotFound("organization.unit_type_not_found", "Birim seviyesi bulunamadı.");

    private static Error Invalid(DomainRuleViolationException exception)
        => Error.Validation("organization.unit_type_invalid", exception.Message);
}
