using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;

public sealed class ApproveDocumentFileSecurityCommandHandler
    : ICommandHandler<ApproveDocumentFileSecurityCommand>
{
    private readonly IDocumentIngestionRepository _ingestions;
    private readonly IInbox<DocumentsBoundary> _inbox;
    private readonly IOutbox<DocumentsBoundary> _outbox;
    private readonly IUnitOfWork<DocumentsBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ApproveDocumentFileSecurityCommandHandler(
        IDocumentIngestionRepository ingestions,
        IInbox<DocumentsBoundary> inbox,
        IOutbox<DocumentsBoundary> outbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _ingestions = ingestions;
        _inbox = inbox;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result> Handle(
        ApproveDocumentFileSecurityCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var ingestion = await _ingestions.GetByIdAsync(
            new DocumentFileIngestionId(command.IngestionId),
            cancellationToken);

        if (ingestion is null)
            return Result.Failure(SecurityResultErrors.IngestionNotFound);

        if (ingestion.DocumentId.Value != command.DocumentId)
            return Result.Failure(SecurityResultErrors.DocumentMismatch);

        try
        {
            ingestion.MarkSecurityApproved(
                command.DetectedMimeType,
                $"{command.ScannerEngine}/{command.ScannerVersion}",
                command.ScannedAt);

            if (ingestion.StagingStorageKey is null ||
                ingestion.Sha256Hash is null ||
                ingestion.StoredSizeBytes is null)
            {
                return Result.Failure(
                    Error.Conflict(
                        "documents.staging_descriptor_missing",
                        "Security-approved ingestion is missing its staging descriptor."));
            }

            _outbox.Enqueue(
                new DocumentFilePromotionRequestedIntegrationEvent(
                    Guid.CreateVersion7(),
                    ingestion.Id.Value,
                    ingestion.DocumentId.Value,
                    ingestion.StagingStorageKey,
                    ingestion.Sha256Hash,
                    ingestion.StoredSizeBytes.Value,
                    command.DetectedMimeType,
                    _timeProvider.GetUtcNow()));

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                command.ScannedAt);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                Error.Conflict(
                    "documents.security_result_conflict",
                    ex.Message));
        }
    }
}
