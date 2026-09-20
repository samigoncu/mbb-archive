using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Previews;

public sealed record DocumentPreviewState(string Status, int? PageCount, string? Message);
public interface IPreviewArtifactStore
{
    Task<Stream?> OpenReadAsync(string key, CancellationToken ct);
}

public sealed class DocumentPreviewHandler(IArchiveFilingCatalog documents,
    IProcessingJobRepository jobs, IPreviewArtifactStore storage)
{
    private async Task<(bool Visible, ProcessingJob? Job)> FindAsync(Guid id, int? versionNumber, CancellationToken ct)
    {
        var document = await documents.GetDocumentAsync(id, ct);
        if (document is null) return (false, null);
        var selectedVersionId = versionNumber is int number
            ? await documents.GetDocumentVersionIdAsync(id, number, ct) : document.LatestVersionId;
        if (versionNumber is not null && selectedVersionId is null) return (false, null);
        var job = selectedVersionId is Guid version
            ? await jobs.GetByDocumentVersionIdAsync(version, ct) : null;
        return (true, job?.DocumentId == id ? job : null);
    }

    private static ProcessingArtifact? Pdf(ProcessingJob? job) => job?.Artifacts
        .Where(x => x.Type == ProcessingArtifactType.PdfNormalized && x.MimeType == "application/pdf")
        .Where(x => (x.Type == ProcessingArtifactType.PdfNormalized || x.Type == ProcessingArtifactType.SearchablePdf) && x.MimeType == "application/pdf")
        .OrderByDescending(x => x.CreatedAt).FirstOrDefault();

    public async Task<Result<DocumentPreviewState>> GetStateAsync(Guid id, CancellationToken ct, int? versionNumber = null)
    {
        if (versionNumber is <= 0) return Result<DocumentPreviewState>.Failure(InvalidVersion());
        var (visible, job) = await FindAsync(id, versionNumber, ct);
        if (!visible) return Result<DocumentPreviewState>.Failure(Missing());
        var state = Pdf(job) is not null ? new DocumentPreviewState("Ready", job!.OcrPageCount, null)
            : job?.Stage == ProcessingStage.Failed ? new("Failed", null, "PDF kopyası oluşturulamadı. Orijinal dosyayı indirebilirsiniz.")
            : job?.Stage is ProcessingStage.Completed or ProcessingStage.Unsupported ? new("Unavailable", null, "Bu sürüm için PDF kopyası bulunmuyor.")
            : new("Pending", null, "PDF kopyası hazırlanıyor. İşlem bitince burada açılacak.");
        return Result<DocumentPreviewState>.Success(state);
    }

    public async Task<Result<Stream>> OpenAsync(Guid id, CancellationToken ct, int? versionNumber = null)
    {
        if (versionNumber is <= 0) return Result<Stream>.Failure(InvalidVersion());
        var (visible, job) = await FindAsync(id, versionNumber, ct);
        if (!visible) return Result<Stream>.Failure(Missing());
        var artifact = Pdf(job);
        if (artifact is null) return Result<Stream>.Failure(Error.NotFound("processing.preview_not_ready", "PDF kopyası henüz hazır değil."));
        var stream = await storage.OpenReadAsync(artifact.StorageKey, ct);
        return stream is null
            ? Result<Stream>.Failure(Error.Conflict("processing.preview_missing", "Kayıtlı PDF kopyası depolamada bulunamadı."))
            : Result<Stream>.Success(stream);
    }
    private static Error Missing() => Error.NotFound("processing.document_not_found", "Belge bulunamadı.");
    private static Error InvalidVersion() => Error.Validation("processing.invalid_version", "Sürüm numarası pozitif olmalıdır.");
}
