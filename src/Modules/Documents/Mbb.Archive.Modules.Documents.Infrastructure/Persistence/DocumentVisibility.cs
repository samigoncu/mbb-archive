using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

/// <summary>
/// <see cref="IDocumentVisibility"/> uygulaması. Kapsam yüklemini belge
/// listesinin kendisiyle sınırlar; sorgu sayfa boyutuyla sınırlı kalır.
/// </summary>
internal sealed class DocumentVisibility : IDocumentVisibility
{
    private readonly DocumentsDbContext _db;
    private readonly ICurrentUserScope _scope;

    public DocumentVisibility(DocumentsDbContext db, ICurrentUserScope scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<IReadOnlySet<Guid>> FilterAsync(
        IReadOnlyCollection<Guid> documentIds,
        CancellationToken cancellationToken)
    {
        if (documentIds.Count == 0)
            return new HashSet<Guid>();

        var scope = await _scope.GetAsync(cancellationToken);

        if (scope.SeesNothing)
            return new HashSet<Guid>();

        var keys = documentIds.Distinct().Select(id => new DocumentId(id)).ToArray();

        var visible = await _db.Documents
            .AsNoTracking()
            .Where(x => keys.Contains(x.Id) && x.Status != DocumentStatus.Cancelled)
            .Where(DocumentAccessFilter.For(scope))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        return visible.Select(x => x.Value).ToHashSet();
    }
}
