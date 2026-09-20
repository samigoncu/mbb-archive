using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Archive.Application.Abstractions;

namespace Mbb.Archive.Modules.Archive.Application.Records.List;

public sealed class GetArchiveRecordsQueryHandler
    : IQueryHandler<GetArchiveRecordsQuery, PagedResult<ArchiveRecordListItem>>
{
    private readonly IArchiveQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetArchiveRecordsQueryHandler(
        IArchiveQueries queries,
        ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
    }

    public async Task<Result<PagedResult<ArchiveRecordListItem>>> Handle(
        GetArchiveRecordsQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<ArchiveRecordListItem>>.Failure(pageResult.Error);

        var result = await _queries.GetPageAsync(
            pageResult.Value,
            query.Status,
            query.DocumentId,
            await _scope.GetAsync(cancellationToken),
            cancellationToken);

        return Result<PagedResult<ArchiveRecordListItem>>.Success(result);
    }
}
