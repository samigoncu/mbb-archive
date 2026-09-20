using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;
public sealed class OrganizationDesignTimeFactory : IDesignTimeDbContextFactory<OrganizationDbContext>
{
    public OrganizationDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Organization")
            ?? "Host=localhost;Database=mbb_archive;Username=mbb_archive";
        return new OrganizationDbContext(new DbContextOptionsBuilder<OrganizationDbContext>()
            .UseNpgsql(connection).Options);
    }
}
