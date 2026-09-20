using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Search;

public sealed class SearchDocumentsQueryHandler
    : IQueryHandler<SearchDocumentsQuery, SearchResponse>
{
    private readonly ISearchGateway _search;
    private readonly ICurrentUserScope _scope;

    public SearchDocumentsQueryHandler(ISearchGateway search, ICurrentUserScope scope)
    {
        _search = search;
        _scope = scope;
    }

    public async Task<Result<SearchResponse>> Handle(
        SearchDocumentsQuery query,
        CancellationToken cancellationToken)
    {

        if (query.Sort is not ("relevance" or "title_asc" or "title_desc" or "newest" or "oldest"))
            return Result<SearchResponse>.Failure(Error.Validation("search.invalid_sort", "Geçerli bir sıralama seçin."));

        if (query.DateField is not ("ingestedAt" or "createdAt") || query.From > query.To
            || query.From?.Year is < 1900 or > 9998 || query.To?.Year is < 1900 or > 9998)
            return Result<SearchResponse>.Failure(Error.Validation("search.invalid_dates",
                "Geçerli bir tarih alanı ve başlangıçtan önce olmayan bitiş tarihi seçin."));

        if (query.Query.Length > 500 || query.Conditions is { Count: > 10 }
            || (query.Conditions?.Any(condition => !SearchConditionRules.IsValid(condition)) ?? false)
            || string.IsNullOrWhiteSpace(query.MetadataKey) != string.IsNullOrWhiteSpace(query.MetadataValue))
            return Result<SearchResponse>.Failure(Error.Validation("search.invalid_conditions",
                "En fazla 10 geçerli koşul kullanın. Anahtar kelime ve koşul değerleri en fazla 500 karakter olabilir."));

        var page = PageRequest.Create(query.Page, query.PageSize);
        if (page.IsFailure)
            return Result<SearchResponse>.Failure(page.Error);
        if ((long)page.Value.Page * page.Value.PageSize > 10000)
            return Result<SearchResponse>.Failure(Error.Validation("search.result_window", "İlk 10.000 sonuç içinde gezinebilirsiniz; aramayı filtrelerle daraltın."));

        var response = await _search.SearchAsync(
            new SearchRequest(
                query.Query.Trim(),
                page.Value.Page,
                page.Value.PageSize,
                query.MimeType,
                query.FilePlanCode,
                query.MetadataKey,
                query.MetadataValue,
                await _scope.GetAsync(cancellationToken),
                query.Conditions,
                query.From,
                query.To,
                query.DateField,
                Sort: query.Sort),
            cancellationToken);

        return Result<SearchResponse>.Success(response);
    }
}
