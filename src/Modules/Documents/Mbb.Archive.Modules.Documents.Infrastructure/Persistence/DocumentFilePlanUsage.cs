using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

/// <summary>Dijital dosyalar konu kodunu taşır; kullanımdaki kod silinemez.</summary>
internal sealed class DocumentFilePlanUsage(DocumentsDbContext db) : IFilePlanCodeUsage
{
    public Task<bool> HasReferencesAsync(string code, CancellationToken ct)
        => db.Set<DigitalDossier>().AnyAsync(x => x.FilePlanCode == code, ct);
}
