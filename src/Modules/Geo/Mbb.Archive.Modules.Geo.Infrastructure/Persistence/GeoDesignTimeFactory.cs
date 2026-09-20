using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence;
public sealed class GeoDesignTimeFactory : IDesignTimeDbContextFactory<GeoDbContext>
{
    public GeoDbContext CreateDbContext(string[] args)
        => new(new DbContextOptionsBuilder<GeoDbContext>().UseNpgsql(
            Environment.GetEnvironmentVariable("ConnectionStrings__Geo") ?? "Host=localhost;Database=mbb_archive;Username=mbb_archive").Options);
}
