using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IDocumentIngestionRepository
{
    Task AddAsync(
        DocumentFileIngestion ingestion,
        CancellationToken cancellationToken);

    Task<DocumentFileIngestion?> GetByIdAsync(
        DocumentFileIngestionId id,
        CancellationToken cancellationToken);
}
