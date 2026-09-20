using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.List;

public sealed class GetDocumentsQueryHandler
    : IQueryHandler<GetDocumentsQuery, PagedResult<DocumentListItem>>
{
    private readonly IDocumentQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetDocumentsQueryHandler(IDocumentQueries queries, ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
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
            query.Filter ?? new DocumentListFilter(),
            query.Sort,
            await _scope.GetAsync(cancellationToken),
            cancellationToken);

        return Result<PagedResult<DocumentListItem>>.Success(result);
    }
}
