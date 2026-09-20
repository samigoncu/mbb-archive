using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Artifacts;
using Mbb.Archive.Modules.Search.Infrastructure.Indexing;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

namespace Mbb.Archive.Modules.Search.UnitTests;

[TestClass]
public sealed class SearchDateTests
{
    [TestMethod]
    public void LegacyEmptyGeoProjection_CanBeReindexedWithoutIgnoringMalformedData()
    {
        Assert.AreEqual(0, SearchIndexDocumentFactory.ReadGeoRelations("{}").Count);
        Assert.ThrowsExactly<JsonException>(() => SearchIndexDocumentFactory.ReadGeoRelations("{\"unexpected\":1}"));
    }

    [TestMethod]
    public void EndDate_IncludesEntireDayInIstanbul()
    {
        using var body = JsonDocument.Parse(OpenSearchHttpClient.BuildSearchBody(new SearchRequest("", 1, 10, null, null, null, null, new AccessScope("test", true, [], [], [], []),
            From: new DateOnly(2026, 9, 1), To: new DateOnly(2026, 9, 5))));
        var bounds = body.RootElement.GetProperty("query").GetProperty("bool").GetProperty("filter")[0]
            .GetProperty("range").GetProperty("ingestedAt");
        Assert.AreEqual("2026-09-01", bounds.GetProperty("gte").GetString());
        Assert.AreEqual("2026-09-06", bounds.GetProperty("lt").GetString());
        Assert.AreEqual("Europe/Istanbul", bounds.GetProperty("time_zone").GetString());
    }

    [TestMethod]
    public async Task InvalidDateRange_DoesNotCallGateway()
    {
        var handler = new SearchDocumentsQueryHandler(new RejectGateway(), new UnrestrictedScope());
        var result = await handler.Handle(new SearchDocumentsQuery("", From: new(2026, 9, 6), To: new(2026, 9, 5)), CancellationToken.None);
        Assert.IsTrue(result.IsFailure);
    }

    [TestMethod]
    public async Task EmptyQuery_WithoutDates_CallsGatewayToSearchAll()
    {
        var gateway = new CaptureGateway();
        var handler = new SearchDocumentsQueryHandler(gateway, new UnrestrictedScope());
        var result = await handler.Handle(new SearchDocumentsQuery(""), CancellationToken.None);
        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual("", gateway.LastRequest?.Query);
        Assert.IsNull(gateway.LastRequest?.From);
        Assert.IsNull(gateway.LastRequest?.To);
    }

    [TestMethod]
    public async Task IndexDate_ComesFromDocumentSource_NotProjectionUpdate()
    {
        var created = DateTimeOffset.Parse("2026-01-01T10:00:00Z");
        var uploaded = created.AddDays(2);
        var source = SearchDocument.Create(Guid.NewGuid(), "Belge", created.AddMonths(5));
        var factory = new SearchIndexDocumentFactory(new NoArtifacts(), new DatesProvider(new(created, uploaded)), new NoVersion());
        var indexed = await factory.CreateAsync(source, CancellationToken.None);
        Assert.AreEqual(created, indexed.CreatedAt);
        Assert.AreEqual(uploaded, indexed.IngestedAt);
        Assert.AreNotEqual(indexed.UpdatedAt, indexed.CreatedAt);
    }

    [TestMethod]
    public async Task DocumentWithoutUpload_DoesNotInventAnUploadDate()
    {
        var created = DateTimeOffset.Parse("2026-01-01T10:00:00Z");
        var factory = new SearchIndexDocumentFactory(new NoArtifacts(), new DatesProvider(new(created, null)), new NoVersion());
        var indexed = await factory.CreateAsync(SearchDocument.Create(Guid.NewGuid(), "Belge", created), CancellationToken.None);
        Assert.IsNull(indexed.IngestedAt);
        Assert.AreEqual(created, indexed.CreatedAt);
    }

    private sealed class NoVersion : Mbb.Archive.Modules.Search.Application.Abstractions.ICurrentVersionProjectionSource
    {
        public Task<Mbb.Archive.Modules.Search.Application.Abstractions.CurrentVersionProjection?> GetAsync(Guid id, CancellationToken ct)
            => Task.FromResult<Mbb.Archive.Modules.Search.Application.Abstractions.CurrentVersionProjection?>(null);
    }
    private sealed class DatesProvider(DocumentSearchDates dates) : IDocumentSearchDatesProvider
    {
        public Task<DocumentSearchDates?> GetAsync(Guid id, CancellationToken ct) => Task.FromResult<DocumentSearchDates?>(dates);
    }
    private sealed class NoArtifacts : ISearchArtifactStore
    {
        public Task<string> ReadTextAsync(string key, CancellationToken ct) => throw new AssertFailedException();
        public Task<byte[]> ReadBytesAsync(string key, CancellationToken ct) => throw new AssertFailedException();
    }
    private sealed class RejectGateway : ISearchGateway
    {
        public Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken ct) => throw new AssertFailedException();
    }
    private sealed class CaptureGateway : ISearchGateway
    {
        public SearchRequest? LastRequest { get; private set; }
        public Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken ct)
        {
            LastRequest = request;
            return Task.FromResult(new SearchResponse(0, [], [], []));
        }
    }
}
