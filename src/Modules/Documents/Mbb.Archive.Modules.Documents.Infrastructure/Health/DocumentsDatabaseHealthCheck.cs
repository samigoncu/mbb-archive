using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Health;

internal sealed class DocumentsDatabaseHealthCheck : IHealthCheck
{
    private readonly IServiceScopeFactory _scopeFactory;

    public DocumentsDatabaseHealthCheck(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();

        var dbContext =
            scope.ServiceProvider.GetRequiredService<DocumentsDbContext>();

        try
        {
            var canConnect =
                await dbContext.Database.CanConnectAsync(cancellationToken);

            return canConnect
                ? HealthCheckResult.Healthy("Documents PostgreSQL is reachable.")
                : HealthCheckResult.Unhealthy("Documents PostgreSQL is not reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                "Documents PostgreSQL readiness check failed.",
                ex);
        }
    }
}
