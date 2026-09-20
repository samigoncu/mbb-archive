using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Search.Application.Abstractions;
namespace Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

// Read cancellation state before every query so index/queue lag cannot resurrect a cancelled result.
internal sealed class ActiveDocumentSearchGateway(OpenSearchHttpClient client, IDocumentSearchExclusions exclusions) : ISearchGateway
{
    public async Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken ct)
        => await client.SearchAsync(request with { ExcludedDocumentIds = await exclusions.GetAsync(ct) }, ct);
}
