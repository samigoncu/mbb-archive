using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class DocumentSearchDatesProvider(DocumentsDbContext db) : IDocumentSearchDatesProvider
{
    public async Task<DocumentSearchDates?> GetAsync(Guid documentId, CancellationToken cancellationToken)
    {
        var id = new DocumentId(documentId);
        return await db.Documents.AsNoTracking().Where(document => document.Id == id)
            .Select(document => new DocumentSearchDates(document.CreatedAt,
                db.FileIngestions.Where(ingestion => ingestion.DocumentId == document.Id)
                    .Min(ingestion => ingestion.StagedAt)))
            .SingleOrDefaultAsync(cancellationToken);
    }
}
