using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class DocumentSearchExclusions(DocumentsDbContext db) : IDocumentSearchExclusions
{
    public async Task<IReadOnlyList<Guid>> GetAsync(CancellationToken ct) => await db.Documents.AsNoTracking()
        .Where(d => d.Status == DocumentStatus.Cancelled).Select(d => d.Id.Value).ToArrayAsync(ct);
}
