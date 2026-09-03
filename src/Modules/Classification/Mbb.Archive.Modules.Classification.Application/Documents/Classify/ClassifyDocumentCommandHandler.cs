using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;

namespace Mbb.Archive.Modules.Classification.Application.Documents.Classify;

public sealed class ClassifyDocumentCommandHandler
    : ICommandHandler<ClassifyDocumentCommand, Guid>
{
    private readonly IClassificationRepository _repository;
    private readonly IOutbox<ClassificationBoundary> _outbox;
    private readonly IUnitOfWork<ClassificationBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ClassifyDocumentCommandHandler(
        IClassificationRepository repository,
        IOutbox<ClassificationBoundary> outbox,
        IUnitOfWork<ClassificationBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result<Guid>> Handle(
        ClassifyDocumentCommand command,
        CancellationToken cancellationToken)
    {
        var plan = await _repository.GetFilePlanAsync(
            new FilePlanId(command.FilePlanId),
            cancellationToken);

        if (plan is null)
        {
            return Result<Guid>.Failure(
                Error.NotFound(
                    "classification.file_plan_not_found",
                    "File plan was not found."));
        }

        var item = plan.Items.SingleOrDefault(
            x => x.Id.Value == command.FilePlanItemId);

        if (item is null)
        {
            return Result<Guid>.Failure(
                Error.NotFound(
                    "classification.file_plan_item_not_found",
                    "File plan item was not found."));
        }

        if (!item.IsSelectable)
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "classification.item_not_selectable",
                    "Selected file plan item is a grouping node and cannot classify a document."));
        }

        var now = _timeProvider.GetUtcNow();
        var classification = DocumentClassification.Create(
            command.DocumentId,
            plan.Id,
            item.Id,
            command.IsPrimary,
            now);

        await _repository.AddClassificationAsync(
            classification,
            cancellationToken);

        _outbox.Enqueue(
            new DocumentClassifiedIntegrationEvent(
                Guid.CreateVersion7(),
                command.DocumentId,
                plan.Id.Value,
                plan.Code,
                plan.Name,
                item.Id.Value,
                item.Code,
                item.Title,
                command.IsPrimary,
                now));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(classification.Id.Value);
    }
}
