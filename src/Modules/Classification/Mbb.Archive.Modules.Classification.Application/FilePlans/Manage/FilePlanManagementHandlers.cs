using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;

namespace Mbb.Archive.Modules.Classification.Application.FilePlans.Manage;

public sealed record RenameFilePlanCommand(Guid FilePlanId, string Name) : ICommand;
public sealed record SetFilePlanActiveCommand(Guid FilePlanId, bool IsActive) : ICommand;

public sealed record UpdateFilePlanItemCommand(
    Guid FilePlanId, Guid ItemId, string Title, string? Description, bool IsSelectable) : ICommand;

public sealed record SetFilePlanItemActiveCommand(Guid FilePlanId, Guid ItemId, bool IsActive) : ICommand;

/// <summary>Yalnız hiç kullanılmamış konu kodu kaldırılabilir.</summary>
public sealed record DeleteFilePlanItemCommand(Guid FilePlanId, Guid ItemId) : ICommand;

public sealed class FilePlanManagementHandlers(
    IClassificationRepository repository,
    IUnitOfWork<ClassificationBoundary> unitOfWork,
    IClassificationQueries queries,
    IEnumerable<IFilePlanCodeUsage> usage)
{
    public async Task<Result> Handle(RenameFilePlanCommand command, CancellationToken ct)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId), ct);
        if (plan is null) return NotFound();

        try { plan.Rename(command.Name); }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> Handle(SetFilePlanActiveCommand command, CancellationToken ct)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId), ct);
        if (plan is null) return NotFound();

        if (command.IsActive) plan.Reinstate(); else plan.Retire();
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> Handle(UpdateFilePlanItemCommand command, CancellationToken ct)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId), ct);
        if (plan is null) return NotFound();

        try { plan.Item(new FilePlanItemId(command.ItemId)).Update(command.Title, command.Description, command.IsSelectable); }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> Handle(SetFilePlanItemActiveCommand command, CancellationToken ct)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId), ct);
        if (plan is null) return NotFound();

        try { plan.Item(new FilePlanItemId(command.ItemId)).SetActive(command.IsActive); }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    /// <summary>
    /// Kullanımdaki konu kodu silinmez.
    /// </summary>
    /// <remarks>
    /// Önce kendi modülündeki belge sınıflandırmaları, sonra diğer modüllerin
    /// bildirdiği başvurular (dijital dosya, fiziksel klasör, birim ataması)
    /// kontrol edilir. Kullanımdaysa kullanıcıya pasife alma önerilir; bu, kaydın
    /// geçmişini bozmadan konuyu kullanımdan çıkarmanın doğru yoludur.
    /// </remarks>
    public async Task<Result> Handle(DeleteFilePlanItemCommand command, CancellationToken ct)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId), ct);
        if (plan is null) return NotFound();

        FilePlanItem item;
        try { item = plan.Item(new FilePlanItemId(command.ItemId)); }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        if (await queries.HasDocumentClassificationsAsync(command.ItemId, ct))
            return InUse("Bu konu koduna sınıflandırılmış belgeler var.");

        foreach (var probe in usage)
        {
            if (await probe.HasReferencesAsync(item.Code, ct))
                return InUse($"{item.Code} kodu dijital dosya, fiziksel klasör ya da birim atamasında kullanılıyor.");
        }

        try { plan.RemoveItem(item.Id); }
        catch (DomainRuleViolationException exception) { return Conflict(exception.Message); }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static Result NotFound()
        => Result.Failure(Error.NotFound("classification.file_plan_not_found", "Dosya planı bulunamadı."));

    private static Result Invalid(string message)
        => Result.Failure(Error.Validation("classification.file_plan_item_invalid", message));

    private static Result Conflict(string message)
        => Result.Failure(Error.Conflict("classification.file_plan_item_conflict", message));

    private static Result InUse(string message)
        => Result.Failure(Error.Conflict("classification.file_plan_item_in_use",
            $"{message} Silmek yerine konuyu pasife alın; kayıtların geçmişi korunur."));
}
