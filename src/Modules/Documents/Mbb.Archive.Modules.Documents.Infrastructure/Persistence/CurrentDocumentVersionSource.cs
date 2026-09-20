using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
internal sealed class CurrentDocumentVersionSource(DocumentsDbContext db) : ICurrentDocumentVersion
{
    public Task<CurrentDocumentVersion?> GetAsync(Guid id, CancellationToken ct) => db.Set<Document>().AsNoTracking()
        .Where(d => d.Id == new DocumentId(id)).SelectMany(d => d.Versions.Where(v => v.VersionNumber == d.CurrentVersionNumber && v.CancelledAt == null))
        .Select(v => new CurrentDocumentVersion(v.Id, v.MimeType)).SingleOrDefaultAsync(ct);
}
