using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.PromoteFile;

public sealed class PromoteDocumentFileCommandHandler
    : ICommandHandler<PromoteDocumentFileCommand>
{
    private readonly IDocumentRepository _documents;
    private readonly IDocumentIngestionRepository _ingestions;
    private readonly IFileStagingService _staging;
    private readonly IOriginalObjectStorage _originalStorage;
    private readonly IInbox<DocumentsBoundary> _inbox;
    private readonly IOutbox<DocumentsBoundary> _outbox;
    private readonly IUnitOfWork<DocumentsBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public PromoteDocumentFileCommandHandler(
        IDocumentRepository documents,
        IDocumentIngestionRepository ingestions,
        IFileStagingService staging,
        IOriginalObjectStorage originalStorage,
        IInbox<DocumentsBoundary> inbox,
        IOutbox<DocumentsBoundary> outbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _documents = documents;
        _ingestions = ingestions;
        _staging = staging;
        _originalStorage = originalStorage;
        _inbox = inbox;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result> Handle(
        PromoteDocumentFileCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var ingestion = await _ingestions.GetByIdAsync(
            new DocumentFileIngestionId(command.IngestionId),
            cancellationToken);

        if (ingestion is null)
        {
            return Result.Failure(
                Error.NotFound(
                    "documents.ingestion_not_found",
                    "Document file ingestion was not found."));
        }

        if (ingestion.DocumentId.Value != command.DocumentId)
        {
            return Result.Failure(
                Error.Conflict(
                    "documents.ingestion_document_mismatch",
                    "Promotion event does not belong to the ingestion document."));
        }

        var document = await _documents.GetByIdAsync(
            new DocumentId(command.DocumentId),
            cancellationToken);

        if (document is null)
        {
            return Result.Failure(
                Error.NotFound(
                    "documents.not_found",
                    "Document was not found."));
        }

        if (ingestion.Status == DocumentFileIngestionStatus.Accepted)
        {
            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                _timeProvider.GetUtcNow());

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }

        if (ingestion.Status != DocumentFileIngestionStatus.SecurityApproved ||
            ingestion.StagingStorageKey is null ||
            ingestion.Sha256Hash is null ||
            ingestion.StoredSizeBytes is null ||
            ingestion.DetectedMimeType is null)
        {
            return Result.Failure(
                Error.Conflict(
                    "documents.ingestion_not_promotable",
                    "Ingestion is not ready for original storage promotion."));
        }

        await using var stagedStream = await _staging.OpenReadAsync(
            ingestion.StagingStorageKey,
            cancellationToken);

        var stored = await _originalStorage.StoreAsync(
            ingestion.Sha256Hash,
            ingestion.DetectedMimeType,
            ingestion.StoredSizeBytes.Value,
            stagedStream,
            cancellationToken);

        try
        {
            var now = _timeProvider.GetUtcNow();

            var version = document.AddVersion(
                stored.StorageKey,
                stored.Sha256Hash,
                ingestion.DetectedMimeType,
                stored.SizeBytes,
                now);

            ingestion.MarkAccepted(
                stored.StorageKey,
                now);

            _outbox.Enqueue(
                new DocumentOriginalStoredIntegrationEvent(
                    Guid.CreateVersion7(),
                    ingestion.Id.Value,
                    document.Id.Value,
                    version.Id,
                    version.VersionNumber,
                    stored.StorageKey,
                    stored.Sha256Hash,
                    stored.SizeBytes,
                    ingestion.DetectedMimeType,
                    now));

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                now);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Staging cleanup transaction sonrası best-effort yapılır.
            // Cleanup başarısızlığı original kayıt bütünlüğünü etkilemez.
            try
            {
                await _staging.DeleteIfExistsAsync(
                    ingestion.StagingStorageKey,
                    cancellationToken);
            }
            catch
            {
                // Orphan staging cleanup job bu kalıntıları ayrıca temizleyecektir.
            }

            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                Error.Conflict(
                    "documents.promotion_conflict",
                    ex.Message));
        }
    }
}
