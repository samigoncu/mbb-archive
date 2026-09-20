using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Reprocess;

public sealed class ReprocessDocumentHandler(
    IArchiveFilingCatalog documents,
    IArchiveUnitDirectory units,
    IProcessingJobRepository jobs,
    IOutbox<ProcessingBoundary> outbox,
    IUnitOfWork<ProcessingBoundary> unitOfWork,
    TimeProvider clock)
{
    public async Task<Result<Guid>> Handle(Guid documentId, CancellationToken ct, Guid? expectedJobId = null)
    {
        var document = await documents.GetDocumentAsync(documentId, ct);
        if (document is null)
            return Result<Guid>.Failure(Error.NotFound("processing.document_not_found", "Belge bulunamadı."));
        if (document.OwnerUnitId is not Guid unitId ||
            await units.ResolveWritableAsync(unitId, "documents.manage.all", ct) is null)
            return Result<Guid>.Failure(new Error("processing.unit_forbidden", "Bu birimin belgelerini işleme yetkiniz yok.", ErrorType.Forbidden));
        var job = document.LatestVersionId is Guid versionId
            ? await jobs.GetByDocumentVersionIdAsync(versionId, ct) : null;
        if (job is null || job.DocumentId != documentId)
            return Result<Guid>.Failure(Error.NotFound("processing.job_not_found", "Belgenin güncel sürümüne ait işleme kaydı bulunamadı."));
        if (expectedJobId is not null && expectedJobId != job.Id.Value)
            return Result<Guid>.Failure(Error.Conflict("processing.version_changed", "Belgenin güncel sürümü değişti. İşlem listesini yenileyin."));
        try
        {
            var now = clock.GetUtcNow();
            job.Reprocess(now);
            IIntegrationEvent request = job.Stage switch
            {
                ProcessingStage.PdfInspectionRequested => new PdfInspectionRequestedIntegrationEvent(Guid.CreateVersion7(), job.Id.Value, job.DocumentId, job.DocumentVersionId, job.OriginalStorageKey, job.Sha256Hash, job.MimeType, now),
                ProcessingStage.OcrRequested => new OcrRequestedIntegrationEvent(Guid.CreateVersion7(), job.Id.Value, job.DocumentId, job.DocumentVersionId, job.OriginalStorageKey, job.Sha256Hash, job.MimeType, now),
                ProcessingStage.TextExtractionRequested => new TextExtractionRequestedIntegrationEvent(Guid.CreateVersion7(), job.Id.Value, job.DocumentId, job.DocumentVersionId, job.OriginalStorageKey, job.Sha256Hash, job.MimeType, now),
                _ => throw new DomainRuleViolationException("Dosya biçimi işlenemiyor.")
            };
            outbox.Enqueue(request);
            await unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(job.Id.Value);
        }
        catch (DomainRuleViolationException ex)
        {
            return Result<Guid>.Failure(Error.Conflict("processing.reprocess_conflict", ex.Message));
        }
    }
}
