using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Domain.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

internal sealed class EfMalatyaApiSettingsStore(OrganizationDbContext db) : IMalatyaApiSettingsStore
{
    public async Task<MalatyaApiSettings> GetAsync(CancellationToken ct)
    {
        var settings = await db.MalatyaApiSettings.FirstOrDefaultAsync(x => x.Id == 1, ct);
        if (settings != null) return settings;

        var initial = new MalatyaApiSettings();
        db.MalatyaApiSettings.Add(initial);
        await db.SaveChangesAsync(ct);
        return initial;
    }
}

