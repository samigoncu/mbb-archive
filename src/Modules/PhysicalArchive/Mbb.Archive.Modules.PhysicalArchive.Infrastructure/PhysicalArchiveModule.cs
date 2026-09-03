using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Application;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Application.Queries;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure;

public static class PhysicalArchiveModule
{
    public static IServiceCollection AddPhysicalArchiveModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PhysicalArchive");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'PhysicalArchive' is not configured.");

        services.AddDbContext<PhysicalArchiveDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IPhysicalArchiveRepository, EfPhysicalArchiveRepository>();
        services.AddScoped<IPhysicalArchiveQueries, EfPhysicalArchiveQueries>();
        services.AddScoped<IUnitOfWork<PhysicalArchiveBoundary>>(
            sp => sp.GetRequiredService<PhysicalArchiveDbContext>());
        services.AddScoped<IOutbox<PhysicalArchiveBoundary>>(
            sp => sp.GetRequiredService<PhysicalArchiveDbContext>());
        services.AddScoped<PhysicalArchiveCommandHandlers>();
        services.AddScoped<PhysicalArchiveQueryHandlers>();
        services.AddHostedService<PhysicalArchiveOutboxPublisher>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            PhysicalArchiveOperationalSnapshotContributor>();

        return services;
    }
}
