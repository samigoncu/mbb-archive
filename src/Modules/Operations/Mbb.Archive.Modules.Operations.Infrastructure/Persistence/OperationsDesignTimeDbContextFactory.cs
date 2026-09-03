using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence;

public sealed class OperationsDesignTimeDbContextFactory : IDesignTimeDbContextFactory<OperationsDbContext>
{
    public OperationsDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Operations")
            ?? "Host=localhost;Port=5432;Database=mbb_archive;Username=postgres;Password=postgres";
        var options = new DbContextOptionsBuilder<OperationsDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new OperationsDbContext(options);
    }
}
