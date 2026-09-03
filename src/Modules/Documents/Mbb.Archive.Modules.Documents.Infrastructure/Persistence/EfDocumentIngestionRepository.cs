using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class EfDocumentIngestionRepository : IDocumentIngestionRepository
{
    private readonly DocumentsDbContext _dbContext;

    public EfDocumentIngestionRepository(DocumentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        DocumentFileIngestion ingestion,
        CancellationToken cancellationToken)
        => await _dbContext.FileIngestions.AddAsync(ingestion, cancellationToken);

    public Task<DocumentFileIngestion?> GetByIdAsync(
        DocumentFileIngestionId id,
        CancellationToken cancellationToken)
        => _dbContext.FileIngestions
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
}
