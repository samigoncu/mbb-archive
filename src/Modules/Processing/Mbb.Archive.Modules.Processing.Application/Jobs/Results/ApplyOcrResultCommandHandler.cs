using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Contracts.Models;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;

public sealed class ApplyOcrResultCommandHandler
    : ICommandHandler<ApplyOcrResultCommand>
{
    private readonly IProcessingJobRepository _jobs;
    private readonly IInbox<ProcessingBoundary> _inbox;
    private readonly IOutbox<ProcessingBoundary> _outbox;
    private readonly IUnitOfWork<ProcessingBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ApplyOcrResultCommandHandler(
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
        ApplyOcrResultCommand command,
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
            var now = _timeProvider.GetUtcNow();
            var artifacts = CreateArtifacts(job, command, now);

            job.ApplyOcrResult(
                $"{command.Engine}/{command.EngineVersion}",
                command.Languages,
                command.PageCount,
                command.AverageConfidence,
                artifacts);

            _outbox.Enqueue(
                new ProcessingReadyForIndexIntegrationEvent(
                    Guid.CreateVersion7(),
                    job.Id.Value,
                    job.DocumentId,
                    job.DocumentVersionId,
                    command.TextArtifact.StorageKey,
                    command.JsonArtifact.StorageKey,
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
            return Result.Failure(
                ProcessingResultErrors.Conflict(ex.Message));
        }
    }

    private static IReadOnlyList<ProcessingArtifact> CreateArtifacts(
        ProcessingJob job,
        ApplyOcrResultCommand command,
        DateTimeOffset now)
    {
        var artifacts = new List<ProcessingArtifact>
        {
            CreateArtifact(
                job,
                command.TextArtifact,
                ProcessingArtifactType.ExtractedText,
                now),

            CreateArtifact(
                job,
                command.JsonArtifact,
                ProcessingArtifactType.OcrJson,
                now)
        };

        if (command.SearchablePdfArtifact is not null)
        {
            artifacts.Add(
                CreateArtifact(
                    job,
                    command.SearchablePdfArtifact,
                    ProcessingArtifactType.SearchablePdf,
                    now));
        }

        return artifacts;
    }

    private static ProcessingArtifact CreateArtifact(
        ProcessingJob job,
        ProcessingArtifactDescriptor source,
        ProcessingArtifactType type,
        DateTimeOffset now)
        => job.CreateArtifact(
            type,
            source.StorageKey,
            source.MimeType,
            source.Sha256Hash,
            source.SizeBytes,
            now);
}
