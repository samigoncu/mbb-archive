using Mbb.Archive.Modules.Processing.Domain.Jobs;

namespace Mbb.Archive.Modules.Processing.Application.Abstractions;

public interface IProcessingJobRepository
{
    Task AddAsync(
        ProcessingJob job,
        CancellationToken cancellationToken);

    Task<ProcessingJob?> GetByIdAsync(
        ProcessingJobId id,
        CancellationToken cancellationToken);

    Task<bool> ExistsForVersionAsync(
        Guid documentVersionId,
        CancellationToken cancellationToken);

    Task<ProcessingJob?> GetByDocumentVersionIdAsync(
        Guid documentVersionId,
        CancellationToken cancellationToken);
}
