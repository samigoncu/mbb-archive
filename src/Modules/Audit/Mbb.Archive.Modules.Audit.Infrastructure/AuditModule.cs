using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Audit.Infrastructure;

public static class AuditModule
{
    public static IServiceCollection AddAuditModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("Audit");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Audit' is not configured.");

        services.AddDbContext<AuditDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<AuditJournalQueries>();
        services.AddScoped<AuditJournalWriter>();
        services.AddScoped<Mbb.Archive.BuildingBlocks.Application.Auditing.IAccessAuditor, PersistentAccessAuditor>();
        services.AddHostedService<AuditEventConsumer>();

        services.AddScoped<
            IOperationalSnapshotContributor,
            AuditOperationalSnapshotContributor>();

        services.AddScoped<
            IIntegrityVerificationContributor,
            AuditHashChainVerifier>();

        return services;
    }
}
