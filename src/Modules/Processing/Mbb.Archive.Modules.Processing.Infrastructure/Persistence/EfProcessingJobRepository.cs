using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence;

internal sealed class EfProcessingJobRepository
    : IProcessingJobRepository
{
    private readonly ProcessingDbContext _dbContext;

    public EfProcessingJobRepository(ProcessingDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        ProcessingJob job,
        CancellationToken cancellationToken)
        => await _dbContext.Jobs.AddAsync(job, cancellationToken);

    public Task<ProcessingJob?> GetByIdAsync(
        ProcessingJobId id,
        CancellationToken cancellationToken)
        => _dbContext.Jobs
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> ExistsForVersionAsync(
        Guid documentVersionId,
        CancellationToken cancellationToken)
        => _dbContext.Jobs
            .AnyAsync(
                x => x.DocumentVersionId == documentVersionId,
                cancellationToken);

    public Task<ProcessingJob?> GetByDocumentVersionIdAsync(
        Guid documentVersionId,
        CancellationToken cancellationToken)
        => _dbContext.Jobs
            .Include(x => x.Artifacts)
            .SingleOrDefaultAsync(
                x => x.DocumentVersionId == documentVersionId,
                cancellationToken);

    public async Task<IReadOnlyList<ProcessingJob>> GetAwaitingIndexJobsByDocumentIdAsync(
        Guid documentId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Jobs
            .Where(x => x.DocumentId == documentId && x.Stage == ProcessingStage.AwaitingIndex)
            .ToListAsync(cancellationToken);
    }
}
