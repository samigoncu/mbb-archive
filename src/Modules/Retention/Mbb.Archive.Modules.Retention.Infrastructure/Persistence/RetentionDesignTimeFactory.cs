using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

// Migration scaffolding must not need unrelated modules or start background workers.
public sealed class RetentionDesignTimeFactory : IDesignTimeDbContextFactory<RetentionDbContext>
{
    public RetentionDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("MBB_RETENTION_MIGRATION_CONNECTION")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__Retention");
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
        if (string.IsNullOrWhiteSpace(connection) && environment == "Development")
        {
            var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Mbb.Archive.slnx")))
                directory = directory.Parent;
            if (directory is not null)
            {
                var path = Path.Combine(directory.FullName, "src/Host/Mbb.Archive.Api/appsettings.Development.json");
                if (File.Exists(path))
                {
                    using var json = JsonDocument.Parse(File.ReadAllText(path));
                    if (json.RootElement.TryGetProperty("ConnectionStrings", out var strings)
                        && strings.TryGetProperty("Retention", out var value)) connection = value.GetString();
                }
            }
        }
        // A credential-free placeholder suffices for migrations add. Database update requires configuration.
        connection = string.IsNullOrWhiteSpace(connection) ? "Host=localhost;Database=mbb_archive_design;Username=design" : connection;
        return new RetentionDbContext(new DbContextOptionsBuilder<RetentionDbContext>().UseNpgsql(connection).Options);
    }
}
