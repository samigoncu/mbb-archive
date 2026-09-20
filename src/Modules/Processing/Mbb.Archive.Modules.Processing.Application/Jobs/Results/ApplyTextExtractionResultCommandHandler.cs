using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;

/// <summary>
/// Office ve düz metin formatlarından çıkarılan aranabilir metni işler.
/// OCR sonucundan farkı: güven skoru ve OCR JSON türevi üretilmez.
/// </summary>
public sealed class ApplyTextExtractionResultCommandHandler
    : ICommandHandler<ApplyTextExtractionResultCommand>
{
    private readonly IProcessingJobRepository _jobs;
    private readonly IInbox<ProcessingBoundary> _inbox;
    private readonly IOutbox<ProcessingBoundary> _outbox;
    private readonly IUnitOfWork<ProcessingBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ApplyTextExtractionResultCommandHandler(
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
        ApplyTextExtractionResultCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var job = await _jobs.GetByIdAsync(
            new ProcessingJobId(command.ProcessingJobId),
            cancellationToken);

        if (job is null)
            return Result.Failure(ProcessingResultErrors.JobNotFound);

        try
        {
            var now = _timeProvider.GetUtcNow();

            var artifact = job.CreateArtifact(
                ProcessingArtifactType.ExtractedText,
                command.TextArtifact.StorageKey,
                command.TextArtifact.MimeType,
                command.TextArtifact.Sha256Hash,
                command.TextArtifact.SizeBytes,
                now);

            if (command.PdfArtifact is { } pdf)
            {
                if (command.JsonArtifact is not { } json || command.AverageConfidence is not { } confidence || string.IsNullOrWhiteSpace(command.Languages))
                    return Result.Failure(Error.Validation("processing.office_result_invalid", "Office rendering requires PDF, OCR JSON and recognition details."));
                job.ApplyOfficeRendering($"{command.Engine}/{command.EngineVersion}", command.Languages,
                    command.PageCount, confidence,
                    [artifact,
                     job.CreateArtifact(ProcessingArtifactType.PdfNormalized, pdf.StorageKey, pdf.MimeType, pdf.Sha256Hash, pdf.SizeBytes, now),
                     job.CreateArtifact(ProcessingArtifactType.OcrJson, json.StorageKey, json.MimeType, json.Sha256Hash, json.SizeBytes, now)]);
            }
            else
            {
                job.ApplyTextExtraction($"{command.Engine}/{command.EngineVersion}", command.PageCount, [artifact]);
            }

            _outbox.Enqueue(
                new ProcessingReadyForIndexIntegrationEvent(
                    Guid.CreateVersion7(),
                    job.Id.Value,
                    job.DocumentId,
                    job.DocumentVersionId,
                    command.TextArtifact.StorageKey,
                    command.JsonArtifact?.StorageKey,
                    now));

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                command.OccurredAt);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(ProcessingResultErrors.Conflict(ex.Message));
        }
    }
}
