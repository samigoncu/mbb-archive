using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence;
internal sealed class EfProcessingQueries : IProcessingQueries
{
    private readonly ProcessingDbContext _db;
    private readonly IDocumentVisibility _visibility;
    public EfProcessingQueries(ProcessingDbContext db, IDocumentVisibility visibility){_db=db;_visibility=visibility;}
    public async Task<PagedResult<ProcessingMonitorItem>> ListAsync(PageRequest page, string? stage, CancellationToken ct)
    {
        var query = _db.Jobs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(stage))
        {
            if (!Enum.TryParse<ProcessingStage>(stage, out var selected) || !Enum.IsDefined(selected))
                return new([],page.Page,page.PageSize,0);
            query = query.Where(job => job.Stage == selected);
        }
        var candidates = await query.Select(job => job.DocumentId).Distinct().ToArrayAsync(ct);
        var visible = new HashSet<Guid>();
        foreach(var batch in candidates.Chunk(500)) visible.UnionWith(await _visibility.FilterAsync(batch,ct));
        var ids = visible.ToArray();
        query = query.Where(job => ids.Contains(job.DocumentId));
        var count = await query.LongCountAsync(ct);
        var jobs = await query.Include(job=>job.Artifacts).OrderByDescending(job=>job.CreatedAt).ThenBy(job=>job.Id)
            .Skip((page.Page-1)*page.PageSize).Take(page.PageSize).ToListAsync(ct);
        var items = jobs.Select(job=>new ProcessingMonitorItem(job.Id.Value,job.DocumentId,job.DocumentVersionId,job.Stage.ToString(),job.MimeType,job.CreatedAt,job.CompletedAt,job.FailureCode,job.FailureDetail,job.OcrPageCount ?? job.PdfPageCount,
            job.Artifacts.Any(a=>a.Type==ProcessingArtifactType.ExtractedText),
            job.Artifacts.Any(a=>a.Type==ProcessingArtifactType.PdfNormalized),
            job.OcrAverageConfidence is not null)).ToArray();
        return new(items,page.Page,page.PageSize,count);
    }
    public async Task<ProcessingJobDetails?> GetByIdAsync(Guid id,CancellationToken ct)
    {
        var job=await _db.Jobs.AsNoTracking().Include(x=>x.Artifacts).SingleOrDefaultAsync(x=>x.Id==new ProcessingJobId(id),ct); if(job is null || !(await _visibility.FilterAsync([job.DocumentId],ct)).Contains(job.DocumentId))return null;
        var artifacts=job.Artifacts.Select(x=>new ProcessingArtifactDetails(x.Id,x.Type.ToString(),x.StorageKey,x.MimeType,x.Sha256Hash,x.SizeBytes,x.CreatedAt)).OrderBy(x=>x.Type).ToArray();
        return new ProcessingJobDetails(job.Id.Value,job.DocumentId,job.DocumentVersionId,job.OriginalStorageKey,job.Sha256Hash,job.MimeType,job.Stage.ToString(),job.CreatedAt,job.StartedAt,job.FailureCode,job.FailureDetail,job.PdfPageCount,job.PdfVersion,job.PdfHasEmbeddedText,job.OcrAverageConfidence,job.OcrPageCount,job.OcrEngine,job.OcrLanguages,artifacts);
    }
}
