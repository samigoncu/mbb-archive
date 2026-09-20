using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Retention.Domain.Cases;
namespace Mbb.Archive.Modules.Retention.Application.Holds.Place;

public sealed class PlaceLegalHoldCommandHandler(IRetentionRepository repository,
    IOutbox<RetentionBoundary> outbox, IUnitOfWork<RetentionBoundary> unitOfWork, TimeProvider time, IDocumentVisibility visibility)
    : ICommandHandler<PlaceLegalHoldCommand, Guid>
{
    public async Task<Result<Guid>> Handle(PlaceLegalHoldCommand command, CancellationToken ct)
    {
        var item = await repository.GetCaseAsync(command.RetentionCaseId, ct);
        if (item is null || !(await visibility.FilterAsync([item.DocumentId], ct)).Contains(item.DocumentId)) return Result<Guid>.Failure(Error.NotFound("retention.case_not_found", "Saklama dosyası bulunamadı."));
        var now = time.GetUtcNow();
        var hold = LegalHold.Place(item.Id, item.ArchiveRecordId, command.Reason, command.PlacedBy, now);
        item.PlaceHold();
        await repository.AddHoldAsync(hold, ct);
        outbox.Enqueue(new LegalHoldPlacedIntegrationEvent(Guid.CreateVersion7(), item.Id, item.ArchiveRecordId, hold.Reason, now));
        outbox.Enqueue(new LegalHoldChangedIntegrationEvent(Guid.CreateVersion7(), hold.Id, item.Id, item.DocumentId,
            command.PlacedBy, "Place", hold.Reason, now));
        await unitOfWork.SaveChangesAsync(ct);
        return Result<Guid>.Success(hold.Id);
    }
}
