using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Search;

public sealed class SearchDocumentsQueryHandler
    : IQueryHandler<SearchDocumentsQuery, SearchResponse>
{
    private readonly ISearchGateway _search;

    public SearchDocumentsQueryHandler(ISearchGateway search)
    {
        _search = search;
    }

    public async Task<Result<SearchResponse>> Handle(
        SearchDocumentsQuery query,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query.Query))
        {
            return Result<SearchResponse>.Failure(
                Error.Validation(
                    "search.query_required",
                    "Search query is required."));
        }

        var page = PageRequest.Create(query.Page, query.PageSize);
        if (page.IsFailure)
            return Result<SearchResponse>.Failure(page.Error);

        var response = await _search.SearchAsync(
            new SearchRequest(
                query.Query.Trim(),
                page.Value.Page,
                page.Value.PageSize,
                query.MimeType,
                query.FilePlanCode,
                query.MetadataKey,
                query.MetadataValue),
            cancellationToken);

        return Result<SearchResponse>.Success(response);
    }
}
