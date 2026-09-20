using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Retention.Domain.Cases;
namespace Mbb.Archive.Modules.Retention.Application.Holds.Release;

public sealed class ReleaseLegalHoldCommandHandler(IRetentionRepository repository, IOutbox<RetentionBoundary> outbox,
    IUnitOfWork<RetentionBoundary> unitOfWork, TimeProvider time, IDocumentVisibility visibility) : ICommandHandler<ReleaseLegalHoldCommand>
{
    public async Task<Result> Handle(ReleaseLegalHoldCommand command, CancellationToken ct)
    {
        var item = await repository.GetCaseAsync(command.RetentionCaseId, ct);
        if (item is null || !(await visibility.FilterAsync([item.DocumentId], ct)).Contains(item.DocumentId)) return Result.Failure(Error.NotFound("retention.case_not_found", "Saklama dosyası bulunamadı."));
        LegalHold? hold;
        if (command.HoldId is { } holdId) hold = await repository.GetHoldAsync(holdId, ct);
        else
        {
            var active = await repository.GetActiveHoldsAsync(item.Id, ct);
            if (active.Count > 1) return Result.Failure(Error.Conflict("retention.hold_selection_required", "Kaldırılacak hukuki blokeyi seçin."));
            hold = active.SingleOrDefault();
        }
        if (hold is null || hold.RetentionCaseId != item.Id)
            return Result.Failure(Error.NotFound("retention.hold_not_found", "Bu dosyaya ait hukuki bloke bulunamadı."));
        if (!hold.IsActive) return Result.Success();
        var now = time.GetUtcNow();
        hold.Release(now, command.Actor, command.Reason);
        item.ReleaseHold();
        outbox.Enqueue(new LegalHoldReleasedIntegrationEvent(Guid.CreateVersion7(), item.Id, item.ArchiveRecordId, now));
        outbox.Enqueue(new LegalHoldChangedIntegrationEvent(Guid.CreateVersion7(), hold.Id, item.Id, item.DocumentId,
            command.Actor, "Release", command.Reason, now));
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
