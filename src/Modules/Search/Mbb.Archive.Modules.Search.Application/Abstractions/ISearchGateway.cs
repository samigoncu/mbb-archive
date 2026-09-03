namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface ISearchGateway
{
    Task<SearchResponse> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken);
}

public sealed record SearchRequest(
    string Query,
    int Page,
    int PageSize,
    string? MimeType,
    string? FilePlanCode,
    string? MetadataKey,
    string? MetadataValue);

public sealed record SearchResponse(
    long Total,
    IReadOnlyList<SearchHit> Hits,
    IReadOnlyList<FacetBucket> MimeTypes,
    IReadOnlyList<FacetBucket> FilePlanCodes);

public sealed record SearchHit(
    Guid DocumentId,
    Guid? DocumentVersionId,
    string Title,
    string? MimeType,
    double Score,
    IReadOnlyList<string> Fragments,
    IReadOnlyList<PageMatch> Pages);

public sealed record PageMatch(
    int PageNumber,
    IReadOnlyList<string> Fragments);

public sealed record FacetBucket(string Key, long Count);
