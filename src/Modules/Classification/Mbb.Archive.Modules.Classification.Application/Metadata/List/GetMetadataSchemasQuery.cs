using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;

namespace Mbb.Archive.Modules.Classification.Application.Metadata.List;

public sealed record GetMetadataSchemasQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IQuery<PagedResult<MetadataSchemaListItem>>;

public sealed class GetMetadataSchemasQueryHandler
    : IQueryHandler<GetMetadataSchemasQuery, PagedResult<MetadataSchemaListItem>>
{
    private readonly IClassificationQueries _queries;

    public GetMetadataSchemasQueryHandler(IClassificationQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<PagedResult<MetadataSchemaListItem>>> Handle(
        GetMetadataSchemasQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<MetadataSchemaListItem>>.Failure(pageResult.Error);

        return Result<PagedResult<MetadataSchemaListItem>>.Success(
            await _queries.GetMetadataSchemasAsync(pageResult.Value, cancellationToken));
    }
}
