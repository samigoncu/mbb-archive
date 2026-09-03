using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;

public sealed class ApplyPdfInspectionResultCommandHandler
    : ICommandHandler<ApplyPdfInspectionResultCommand>
{
    private readonly IProcessingJobRepository _jobs;
    private readonly IInbox<ProcessingBoundary> _inbox;
    private readonly IOutbox<ProcessingBoundary> _outbox;
    private readonly IUnitOfWork<ProcessingBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ApplyPdfInspectionResultCommandHandler(
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

    public async Task<Result> Handle(
        ApplyPdfInspectionResultCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(
                command.MessageId,
                cancellationToken))
        {
            return Result.Success();
        }

        var job = await _jobs.GetByIdAsync(
            new ProcessingJobId(command.ProcessingJobId),
            cancellationToken);

        if (job is null)
            return Result.Failure(ProcessingResultErrors.JobNotFound);

        try
        {
            if (command.IsEncrypted)
            {
                job.MarkFailed(
                    "pdf_encrypted",
                    "Encrypted/password-protected PDF cannot be processed automatically.");
            }
            else
            {
                var now = _timeProvider.GetUtcNow();
                var artifacts = CreateArtifacts(job, command, now);

                var requiresOcr = job.ApplyPdfInspection(
                    command.PageCount,
                    command.PdfVersion,
                    command.HasEmbeddedText,
                    command.RequiresOcr,
                    artifacts);

                QueueNextStage(job, requiresOcr, command, now);
            }

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                command.OccurredAt);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                ProcessingResultErrors.Conflict(ex.Message));
        }
    }

    private static IReadOnlyList<ProcessingArtifact> CreateArtifacts(
        ProcessingJob job,
        ApplyPdfInspectionResultCommand command,
        DateTimeOffset now)
    {
        var artifacts = new List<ProcessingArtifact>();

        if (command.TextArtifact is { } text)
        {
            artifacts.Add(job.CreateArtifact(
                ProcessingArtifactType.ExtractedText,
                text.StorageKey,
                text.MimeType,
                text.Sha256Hash,
                text.SizeBytes,
                now));
        }

        if (command.JsonArtifact is { } json)
        {
            artifacts.Add(job.CreateArtifact(
                ProcessingArtifactType.OcrJson,
                json.StorageKey,
                json.MimeType,
                json.Sha256Hash,
                json.SizeBytes,
                now));
        }

        return artifacts;
    }

    private void QueueNextStage(
        ProcessingJob job,
        bool requiresOcr,
        ApplyPdfInspectionResultCommand command,
        DateTimeOffset now)
    {
        if (requiresOcr)
        {
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

            return;
        }

        _outbox.Enqueue(
            new ProcessingReadyForIndexIntegrationEvent(
                Guid.CreateVersion7(),
                job.Id.Value,
                job.DocumentId,
                job.DocumentVersionId,
                command.TextArtifact?.StorageKey,
                command.JsonArtifact?.StorageKey,
                now));
    }
}
