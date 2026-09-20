using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
public sealed class PhysicalArchiveDesignTimeFactory : IDesignTimeDbContextFactory<PhysicalArchiveDbContext>
{
    public PhysicalArchiveDbContext CreateDbContext(string[] args)
        => new(new DbContextOptionsBuilder<PhysicalArchiveDbContext>().UseNpgsql(
            Environment.GetEnvironmentVariable("MBB_PHYSICAL_ARCHIVE_MIGRATION_CONNECTION")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__PhysicalArchive")
            ?? "Host=localhost;Database=mbb_archive_design;Username=design").Options);
}
