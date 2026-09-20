using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence;

internal sealed class EfGeoServiceStore(GeoDbContext db) : IGeoServiceStore
{
    public async Task<IReadOnlyList<GeoService>> GetServicesAsync(CancellationToken ct)
        => await db.Services.Include(x => x.Layers).OrderBy(x => x.SortOrder).ToListAsync(ct);

    public Task<GeoService?> GetServiceAsync(Guid id, CancellationToken ct)
        => db.Services.Include(x => x.Layers).SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<GeoBasemap> GetBasemapAsync(CancellationToken ct)
        => db.Basemap.SingleAsync(x => x.Id == 1, ct);

    public void Add(GeoService service) => db.Services.Add(service);

    public void Remove(GeoService service) => db.Services.Remove(service);
}
