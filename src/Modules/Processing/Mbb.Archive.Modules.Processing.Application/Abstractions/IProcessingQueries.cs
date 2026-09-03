using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;

namespace Mbb.Archive.Modules.Processing.Application.Abstractions;

public interface IProcessingQueries
{
    Task<ProcessingJobDetails?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);
}
