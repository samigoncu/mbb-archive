using Mbb.Archive.Modules.Processing.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence;
internal sealed class EfProcessingQueries : IProcessingQueries
{
    private readonly ProcessingDbContext _db; public EfProcessingQueries(ProcessingDbContext db){_db=db;}
    public async Task<ProcessingJobDetails?> GetByIdAsync(Guid id,CancellationToken ct)
    {
        var job=await _db.Jobs.AsNoTracking().Include(x=>x.Artifacts).SingleOrDefaultAsync(x=>x.Id==new ProcessingJobId(id),ct); if(job is null)return null;
        var artifacts=job.Artifacts.Select(x=>new ProcessingArtifactDetails(x.Id,x.Type.ToString(),x.StorageKey,x.MimeType,x.Sha256Hash,x.SizeBytes,x.CreatedAt)).OrderBy(x=>x.Type).ToArray();
        return new ProcessingJobDetails(job.Id.Value,job.DocumentId,job.DocumentVersionId,job.OriginalStorageKey,job.Sha256Hash,job.MimeType,job.Stage.ToString(),job.CreatedAt,job.StartedAt,job.FailureCode,job.FailureDetail,job.PdfPageCount,job.PdfVersion,job.PdfHasEmbeddedText,job.OcrAverageConfidence,job.OcrPageCount,job.OcrEngine,job.OcrLanguages,artifacts);
    }
}
