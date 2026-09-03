using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Highlights;

public sealed class GetHighlightBoxesQueryHandler
    : IQueryHandler<GetHighlightBoxesQuery, IReadOnlyList<HighlightBox>>
{
    private readonly ISearchProjectionQueries _projections;
    private readonly IOcrHighlightReader _highlights;

    public GetHighlightBoxesQueryHandler(
        ISearchProjectionQueries projections,
        IOcrHighlightReader highlights)
    {
        _projections = projections;
        _highlights = highlights;
    }

    public async Task<Result<IReadOnlyList<HighlightBox>>> Handle(
        GetHighlightBoxesQuery query,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query.Query))
        {
            return Result<IReadOnlyList<HighlightBox>>.Failure(
                Error.Validation("search.query_required", "Search query is required."));
        }

        var key = await _projections.GetOcrJsonStorageKeyAsync(
            query.DocumentId,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(key))
        {
            return Result<IReadOnlyList<HighlightBox>>.Success([]);
        }

        var result = await _highlights.FindAsync(
            key,
            query.Query,
            query.PageNumber,
            cancellationToken);

        return Result<IReadOnlyList<HighlightBox>>.Success(result);
    }
}
