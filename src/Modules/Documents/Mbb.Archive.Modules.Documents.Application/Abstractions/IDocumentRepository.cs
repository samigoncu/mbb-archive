using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IDocumentRepository
{
    Task AddAsync(Document document, CancellationToken cancellationToken);

    Task<Document?> GetByIdAsync(
        DocumentId id,
        CancellationToken cancellationToken);
}
