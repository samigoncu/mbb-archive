using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

/// <summary>
/// Yerleşim düzenleme ve yerleşim seviyesi kataloğu komutları.
/// </summary>
/// <remarks>
/// Klasör ve ödünç komutlarıyla aynı sınıfın parçasıdır; bağımlılıkları ve
/// işlem sınırı ortaktır. Ayrı dosyada durmalarının nedeni yalnız okunabilirlik:
/// tek dosya beş yüz satırı aşmıştı ve iki ayrı konuyu bir arada taşıyordu.
/// </remarks>
public sealed partial class PhysicalArchiveCommandHandlers
{
    public async Task<Result> Handle(
        UpdateLocationCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Code) || string.IsNullOrWhiteSpace(command.Name) || string.IsNullOrWhiteSpace(command.Barcode))
            return Result.Failure(Error.Validation("physical_archive.invalid", "Konum kodu, adı ve barkodu zorunludur."));

        var location = await _repository.GetLocationAsync(command.Id, cancellationToken);
        if (location is null) return Result.Failure(LocationNotFound());

        if (await _repository.IdentityExistsAsync(command.Code, command.Barcode, cancellationToken, command.Id))
            return Result.Failure(DuplicateIdentity());

        var locationType = await _repository.GetLocationTypeAsync(location.TypeCode, cancellationToken);
        if (locationType is null)
            return Result.Failure(Error.Validation("physical_archive.invalid", "Konumun yerleşim seviyesi tanımlı değil."));

        try { location.Update(locationType, command.Code, command.Name, command.Barcode, command.Capacity); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Validation("physical_archive.invalid", ex.Message)); }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(
        SetLocationActiveCommand command,
        CancellationToken cancellationToken)
    {
        var location = await _repository.GetLocationAsync(command.Id, cancellationToken);
        if (location is null) return Result.Failure(LocationNotFound());

        if (command.IsActive) location.Reactivate();
        else location.Deactivate();

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(
        DeleteLocationCommand command,
        CancellationToken cancellationToken)
    {
        var location = await _repository.GetLocationAsync(command.Id, cancellationToken);
        if (location is null) return Result.Failure(LocationNotFound());

        // Silme geri alınamaz; bağlı kayıt varsa konum kaldırılmaz. Kullanımdan
        // çıkarmak için pasife alma yolu önerilir, böylece geçmiş korunur.
        if (await _repository.LocationHasChildrenAsync(command.Id, cancellationToken))
            return Result.Failure(Error.Conflict("physical_archive.location_has_children",
                "Bu konumun altında başka konumlar var. Önce onları silin ya da konumu pasife alın."));

        var folders = await _repository.FolderCountAtLocationAsync(command.Id, cancellationToken);
        if (folders > 0)
            return Result.Failure(Error.Conflict("physical_archive.location_in_use",
                $"Bu konumda {folders} fiziksel dosya duruyor. Dosyaları başka bir rafa taşıdıktan sonra silebilir ya da konumu pasife alabilirsiniz."));

        _repository.RemoveLocation(location);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }


    public async Task<Result<Guid>> Handle(
        CreateLocationTypeCommand command,
        CancellationToken cancellationToken)
    {
        if (await _repository.GetLocationTypeAsync(command.Code?.Trim() ?? "", cancellationToken) is not null)
            return Result<Guid>.Failure(Error.Conflict("physical_archive.location_type_exists",
                "Bu kodla bir yerleşim seviyesi zaten tanımlı."));

        try
        {
            var definition = ArchiveLocationTypeDefinition.Create(
                command.Code ?? "", command.Name, command.Level, command.CanStoreFolder, command.AllowsCapacity);
            await _repository.AddLocationTypeAsync(definition, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(definition.Id);
        }
        catch (DomainRuleViolationException ex) { return Invalid<Guid>(ex.Message); }
    }

    public async Task<Result> Handle(
        UpdateLocationTypeCommand command,
        CancellationToken cancellationToken)
    {
        var definition = await _repository.GetLocationTypeAsync(command.Code, cancellationToken);
        if (definition is null) return Result.Failure(LocationTypeNotFound());

        // Seviye derinliği değişince mevcut ağaç kuralı bozabilir; kullanımda
        // olan seviyenin derinliği yalnız ağaç boşken değiştirilebilir.
        if (definition.Level != command.Level
            && await _repository.LocationCountByTypeAsync(command.Code, cancellationToken) > 0)
            return Result.Failure(Error.Conflict("physical_archive.location_type_in_use",
                "Bu seviyede tanımlı konumlar var; derinliği değiştirmeden önce konumları kaldırın."));

        try { definition.Update(command.Name, command.Level, command.CanStoreFolder, command.AllowsCapacity); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Validation("physical_archive.invalid", ex.Message)); }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(
        SetLocationTypeActiveCommand command,
        CancellationToken cancellationToken)
    {
        var definition = await _repository.GetLocationTypeAsync(command.Code, cancellationToken);
        if (definition is null) return Result.Failure(LocationTypeNotFound());

        try { definition.SetActive(command.IsActive); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Validation("physical_archive.invalid", ex.Message)); }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> Handle(
        DeleteLocationTypeCommand command,
        CancellationToken cancellationToken)
    {
        var definition = await _repository.GetLocationTypeAsync(command.Code, cancellationToken);
        if (definition is null) return Result.Failure(LocationTypeNotFound());

        if (definition.IsBuiltIn)
            return Result.Failure(Error.Conflict("physical_archive.location_type_built_in",
                "Kurulumla gelen seviye silinemez; kullanmıyorsanız pasife alın."));

        var used = await _repository.LocationCountByTypeAsync(command.Code, cancellationToken);
        if (used > 0)
            return Result.Failure(Error.Conflict("physical_archive.location_type_in_use",
                $"Bu seviyede {used} konum tanımlı. Önce o konumları kaldırın ya da seviyeyi pasife alın."));

        _repository.RemoveLocationType(definition);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static Error LocationTypeNotFound()
        => Error.NotFound("physical_archive.location_type_not_found", "Yerleşim seviyesi bulunamadı.");
}
