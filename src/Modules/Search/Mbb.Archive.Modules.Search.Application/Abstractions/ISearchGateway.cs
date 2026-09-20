using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface ISearchGateway
{
    Task<SearchResponse> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken);
}

/// <param name="Scope">
/// Çağıranın erişim kapsamı. Bilinçli olarak zorunludur: isteğe bağlı olsaydı
/// bir çağrı yerinde unutulduğunda arama tüm belgelerin içeriğini sızdırırdı.
/// </param>
public sealed record SearchRequest(
    string Query,
    int Page,
    int PageSize,
    string? MimeType,
    string? FilePlanCode,
    string? MetadataKey,
    string? MetadataValue,
    AccessScope Scope,
    IReadOnlyList<SearchCondition>? Conditions = null,
    DateOnly? From = null,
    DateOnly? To = null,
    string DateField = "ingestedAt",
    IReadOnlyList<Guid>? ExcludedDocumentIds = null,
    string Sort = "relevance");

public sealed record SearchCondition(string Field, string Operator, string Value);

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
    IReadOnlyList<PageMatch> Pages,
    /// <summary>Sonucun neden bulunduğunu gösteren CBS ilişkileri (§30 adım 13).</summary>
    IReadOnlyList<GeoMatch> GeoMatches,
    DateTimeOffset? CreatedAt = null,
    DateTimeOffset? IngestedAt = null);

public sealed record GeoMatch(
    string Name,
    string EntityType,
    string RelationType);

public sealed record PageMatch(
    int PageNumber,
    IReadOnlyList<string> Fragments);

public sealed record FacetBucket(string Key, long Count);
