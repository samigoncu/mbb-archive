using Mbb.Archive.Modules.Search.Domain.Documents;

namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface ISearchDocumentRepository
{
    Task<SearchDocument?> GetAsync(Guid documentId, CancellationToken cancellationToken);
    Task AddAsync(SearchDocument document, CancellationToken cancellationToken);
    void RequestIndex(Guid documentId, long revision, DateTimeOffset requestedAt);
}
