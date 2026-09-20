using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Application.Documents.StageFile;

public sealed class StageDocumentFileCommandHandler
    : ICommandHandler<StageDocumentFileCommand, StageDocumentFileResponse>
{
    private readonly IDocumentRepository _documents;
    private readonly IDocumentIngestionRepository _ingestions;
    private readonly IFileStagingService _staging;
    private readonly IOutbox<DocumentsBoundary> _outbox;
    private readonly IUnitOfWork<DocumentsBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public StageDocumentFileCommandHandler(
        IDocumentRepository documents,
        IDocumentIngestionRepository ingestions,
        IFileStagingService staging,
        IOutbox<DocumentsBoundary> outbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _documents = documents;
        _ingestions = ingestions;
        _staging = staging;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result<StageDocumentFileResponse>> Handle(
        StageDocumentFileCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.OriginalFileName))
            return Result<StageDocumentFileResponse>.Failure(StageDocumentFileErrors.FileNameRequired);

        if (command.DeclaredSizeBytes <= 0)
            return Result<StageDocumentFileResponse>.Failure(StageDocumentFileErrors.InvalidSize);

        if (string.IsNullOrWhiteSpace(command.SubmittedBy))
        {
            return Result<StageDocumentFileResponse>.Failure(
                Error.Validation(
                    "documents.submitter_required",
                    "The submitting subject could not be resolved."));
        }

        var document = await _documents.GetByIdAsync(
            new DocumentId(command.DocumentId),
            cancellationToken);

        if (document is null)
            return Result<StageDocumentFileResponse>.Failure(StageDocumentFileErrors.DocumentNotFound);

        try
        {
            var now = _timeProvider.GetUtcNow();

            var ingestion = document.BeginFileIngestion(
                command.OriginalFileName,
                command.ClientContentType,
                command.DeclaredSizeBytes,
                command.SubmittedBy,
                command.VersionReason,
                now);

            var staged = await _staging.StageAsync(
                ingestion.Id,
                command.Content,
                cancellationToken);

            ingestion.MarkStaged(
                staged.StorageKey,
                staged.Sha256Hash,
                staged.SizeBytes,
                _timeProvider.GetUtcNow());

            await _ingestions.AddAsync(ingestion, cancellationToken);

            _outbox.Enqueue(
                new DocumentFileStagedIntegrationEvent(
                    Guid.CreateVersion7(),
                    ingestion.Id.Value,
                    document.Id.Value,
                    staged.StorageKey,
                    staged.Sha256Hash,
                    staged.SizeBytes,
                    _timeProvider.GetUtcNow()));

            try
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // Object storage ile relational DB arasında distributed transaction kullanmıyoruz.
                // DB commit başarısız olursa best-effort compensation yapıyoruz.
                // Process crash gibi durumlarda ayrıca orphan-staging cleanup job çalışacaktır.
                await _staging.DeleteIfExistsAsync(staged.StorageKey, CancellationToken.None);
                throw;
            }

            return Result<StageDocumentFileResponse>.Success(
                new StageDocumentFileResponse(
                    ingestion.Id.Value,
                    document.Id.Value,
                    ingestion.Status.ToString(),
                    staged.Sha256Hash,
                    staged.SizeBytes));
        }
        catch (FileStagingRejectedException ex)
        {
            return Result<StageDocumentFileResponse>.Failure(
                Error.Validation("documents.file_rejected", ex.Message));
        }
        catch (DomainRuleViolationException ex)
        {
            return Result<StageDocumentFileResponse>.Failure(
                StageDocumentFileErrors.DomainConflict(ex.Message));
        }
    }
}
