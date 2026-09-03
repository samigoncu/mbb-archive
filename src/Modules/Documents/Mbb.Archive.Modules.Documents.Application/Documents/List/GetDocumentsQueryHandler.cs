using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.List;

public sealed class GetDocumentsQueryHandler
    : IQueryHandler<GetDocumentsQuery, PagedResult<DocumentListItem>>
{
    private readonly IDocumentQueries _queries;

    public GetDocumentsQueryHandler(IDocumentQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<PagedResult<DocumentListItem>>> Handle(
        GetDocumentsQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<DocumentListItem>>.Failure(pageResult.Error);

        var result = await _queries.GetPageAsync(
            pageResult.Value,
            cancellationToken);

        return Result<PagedResult<DocumentListItem>>.Success(result);
    }
}
