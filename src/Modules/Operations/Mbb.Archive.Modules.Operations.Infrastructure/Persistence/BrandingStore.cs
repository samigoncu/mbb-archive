using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Operations.Application.Branding;
using Mbb.Archive.Modules.Operations.Domain.Branding;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence;

internal sealed class BrandingStore(OperationsDbContext db) : IBrandingStore
{
    public Task<BrandingSettings> GetSettingsAsync(CancellationToken ct)
        => db.Set<BrandingSettings>().SingleAsync(x => x.Id == 1, ct);

    public async Task<IReadOnlyList<BrandingAsset>> GetAssetsAsync(CancellationToken ct)
        => await db.Set<BrandingAsset>().OrderBy(x => x.Kind).ToListAsync(ct);

    public Task<BrandingAsset?> GetAssetAsync(string kind, CancellationToken ct)
        => db.Set<BrandingAsset>().SingleOrDefaultAsync(x => x.Kind == kind, ct);

    public void Add(BrandingAsset asset) => db.Set<BrandingAsset>().Add(asset);

    public void Remove(BrandingAsset asset) => db.Set<BrandingAsset>().Remove(asset);
}
