using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class EfDocumentRepository : IDocumentRepository
{
    private readonly DocumentsDbContext _dbContext;

    public EfDocumentRepository(DocumentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        Document document,
        CancellationToken cancellationToken)
        => await _dbContext.Documents.AddAsync(document, cancellationToken);

    public Task<Document?> GetByIdAsync(
        DocumentId id,
        CancellationToken cancellationToken)
        => _dbContext.Documents
            .Include(x => x.Versions)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
}
