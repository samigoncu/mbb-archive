using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Contracts;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence;
internal sealed class ProcessedVersionArtifactsSource(IProcessingJobRepository jobs) : IProcessedVersionArtifacts
{
    public async Task<ProcessedVersionArtifacts?> GetAsync(Guid documentId, Guid versionId, CancellationToken ct)
    {
        var job = await jobs.GetByDocumentVersionIdAsync(versionId, ct);
        if (job?.DocumentId != documentId) return null;
        string? Key(ProcessingArtifactType type) => job.Artifacts.Where(a => a.Type == type).OrderByDescending(a => a.CreatedAt).Select(a => a.StorageKey).FirstOrDefault();
        return new(Key(ProcessingArtifactType.ExtractedText), Key(ProcessingArtifactType.OcrJson));
    }
}
