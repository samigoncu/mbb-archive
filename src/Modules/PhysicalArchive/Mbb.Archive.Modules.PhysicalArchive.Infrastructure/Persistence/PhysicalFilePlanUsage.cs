using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

/// <summary>Fiziksel klasörler konu kodunu taşır; kullanımdaki kod silinemez.</summary>
internal sealed class PhysicalFilePlanUsage(PhysicalArchiveDbContext db) : IFilePlanCodeUsage
{
    public Task<bool> HasReferencesAsync(string code, CancellationToken ct)
        => db.Folders.AnyAsync(x => x.FilePlanCode == code, ct);
}
