using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;

namespace Mbb.Archive.Modules.Classification.Application.FilePlans.List;

public sealed record GetFilePlansQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IQuery<PagedResult<FilePlanListItem>>;

public sealed class GetFilePlansQueryHandler
    : IQueryHandler<GetFilePlansQuery, PagedResult<FilePlanListItem>>
{
    private readonly IClassificationQueries _queries;

    public GetFilePlansQueryHandler(IClassificationQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<PagedResult<FilePlanListItem>>> Handle(
        GetFilePlansQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<FilePlanListItem>>.Failure(pageResult.Error);

        return Result<PagedResult<FilePlanListItem>>.Success(
            await _queries.GetFilePlansAsync(pageResult.Value, cancellationToken));
    }
}
