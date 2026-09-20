using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Start;

public sealed class StartProcessingCommandHandler
    : ICommandHandler<StartProcessingCommand, Guid>
{
    private readonly IProcessingJobRepository _jobs;
    private readonly IInbox<ProcessingBoundary> _inbox;
    private readonly IOutbox<ProcessingBoundary> _outbox;
    private readonly IUnitOfWork<ProcessingBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public StartProcessingCommandHandler(
        IProcessingJobRepository jobs,
        IInbox<ProcessingBoundary> inbox,
        IOutbox<ProcessingBoundary> outbox,
        IUnitOfWork<ProcessingBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _jobs = jobs;
        _inbox = inbox;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result<Guid>> Handle(
        StartProcessingCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(command.MessageId, cancellationToken))
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "processing.message_already_processed",
                    "The source message has already been processed."));
        }

        if (await _jobs.ExistsForVersionAsync(
                command.DocumentVersionId,
                cancellationToken))
        {
            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                _timeProvider.GetUtcNow());

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Failure(
                Error.Conflict(
                    "processing.version_already_started",
                    "Processing already exists for this document version."));
        }

        try
        {
            var now = _timeProvider.GetUtcNow();

            var job = ProcessingJob.Create(
                command.DocumentId,
                command.DocumentVersionId,
                command.OriginalStorageKey,
                command.Sha256Hash,
                command.MimeType,
                now);

            job.QueueInitialStage(now);

            await _jobs.AddAsync(job, cancellationToken);

            _outbox.Enqueue(
                new ProcessingStartedIntegrationEvent(
                    Guid.CreateVersion7(),
                    job.Id.Value,
                    job.DocumentId,
                    job.DocumentVersionId,
                    job.Stage.ToString(),
                    now));

            QueueWorkerRequest(job, now);

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                now);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(job.Id.Value);
        }
        catch (DomainRuleViolationException ex)
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "processing.start_conflict",
                    ex.Message));
        }
    }

    private void QueueWorkerRequest(
        ProcessingJob job,
        DateTimeOffset now)
    {
        switch (job.Stage)
        {
            case ProcessingStage.PdfInspectionRequested:
                _outbox.Enqueue(
                    new PdfInspectionRequestedIntegrationEvent(
                        Guid.CreateVersion7(),
                        job.Id.Value,
                        job.DocumentId,
                        job.DocumentVersionId,
                        job.OriginalStorageKey,
                        job.Sha256Hash,
                        job.MimeType,
                        now));
                break;

            case ProcessingStage.OcrRequested:
                _outbox.Enqueue(
                    new OcrRequestedIntegrationEvent(
                        Guid.CreateVersion7(),
                        job.Id.Value,
                        job.DocumentId,
                        job.DocumentVersionId,
                        job.OriginalStorageKey,
                        job.Sha256Hash,
                        job.MimeType,
                        now));
                break;

            case ProcessingStage.TextExtractionRequested:
                _outbox.Enqueue(
                    new TextExtractionRequestedIntegrationEvent(
                        Guid.CreateVersion7(),
                        job.Id.Value,
                        job.DocumentId,
                        job.DocumentVersionId,
                        job.OriginalStorageKey,
                        job.Sha256Hash,
                        job.MimeType,
                        now));
                break;
        }
    }
}
