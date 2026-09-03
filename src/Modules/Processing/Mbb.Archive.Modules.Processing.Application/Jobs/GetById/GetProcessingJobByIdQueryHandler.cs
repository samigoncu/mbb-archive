using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Application.Abstractions;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.GetById;

public sealed class GetProcessingJobByIdQueryHandler
    : IQueryHandler<GetProcessingJobByIdQuery, ProcessingJobDetails>
{
    private readonly IProcessingQueries _queries;

    public GetProcessingJobByIdQueryHandler(IProcessingQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<ProcessingJobDetails>> Handle(
        GetProcessingJobByIdQuery query,
        CancellationToken cancellationToken)
    {
        var job = await _queries.GetByIdAsync(
            query.Id,
            cancellationToken);

        return job is null
            ? Result<ProcessingJobDetails>.Failure(
                Error.NotFound(
                    "processing.job_not_found",
                    "Processing job was not found."))
            : Result<ProcessingJobDetails>.Success(job);
    }
}
