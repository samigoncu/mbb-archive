using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Indexing;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Contracts;

namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence;

internal sealed class EfSearchDocumentRepository : ISearchDocumentRepository, ISearchProjectionQueries
{
    private readonly SearchDbContext _dbContext;
    private readonly IArchiveFilingCatalog _documents;
    private readonly IProcessedVersionArtifacts _artifacts;
    public EfSearchDocumentRepository(SearchDbContext dbContext, IArchiveFilingCatalog documents, IProcessedVersionArtifacts artifacts)
    { _dbContext=dbContext; _documents=documents; _artifacts=artifacts; }

    public Task<SearchDocument?> GetAsync(Guid documentId,CancellationToken cancellationToken)
        => _dbContext.Documents.SingleOrDefaultAsync(x=>x.Id==documentId,cancellationToken);

    public async Task AddAsync(SearchDocument document,CancellationToken cancellationToken)
        => await _dbContext.Documents.AddAsync(document,cancellationToken);

    public void RequestIndex(Guid documentId,long revision,DateTimeOffset requestedAt)
    {
        // Find önce change tracker'a, bulamazsa veritabanına bakar. Yalnız Local'e
        // bakmak, aynı belgeye ait ikinci olayı (ör. ready-for-index) yeni bir
        // scope'ta yeniden ekletip PK_index_requests çakışmasına yol açıyordu.
        var request=_dbContext.IndexRequests.Find(documentId);
        if(request is null)
        {
            request=new SearchIndexRequest(documentId,revision,requestedAt);
            _dbContext.IndexRequests.Add(request);
        }
        else request.Refresh(revision,requestedAt);
    }

    private async Task<ProcessedVersionArtifacts?> CurrentArtifacts(Guid id, CancellationToken ct)
    {
        var document = await _documents.GetDocumentAsync(id, ct);
        return document?.LatestVersionId is Guid version ? await _artifacts.GetAsync(id, version, ct) : null;
    }
    public async Task<string?> GetOcrJsonStorageKeyAsync(Guid documentId,CancellationToken cancellationToken)
        => (await CurrentArtifacts(documentId, cancellationToken))?.OcrKey;

    public async Task<string?> GetTextStorageKeyAsync(Guid documentId,CancellationToken cancellationToken)
        => (await CurrentArtifacts(documentId, cancellationToken))?.TextKey;
}
