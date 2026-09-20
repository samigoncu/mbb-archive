using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Collections.Application;
using Mbb.Archive.Modules.Collections.Application.Abstractions;
using Mbb.Archive.Modules.Collections.Application.Collections;
using Mbb.Archive.Modules.Collections.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Collections.Infrastructure;

public static class CollectionsModule
{
    public static IServiceCollection AddCollectionsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Collections");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Collections' is not configured.");

        services.AddDbContext<CollectionsDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<EfCollectionRepository>();

        services.AddScoped<ICollectionRepository>(
            sp => sp.GetRequiredService<EfCollectionRepository>());

        services.AddScoped<ICollectionQueries>(
            sp => sp.GetRequiredService<EfCollectionRepository>());

        services.AddScoped<IUnitOfWork<CollectionsBoundary>>(
            sp => sp.GetRequiredService<CollectionsDbContext>());

        services.AddScoped<CollectionCommandHandlers>();
        services.AddScoped<CollectionQueryHandlers>();

        return services;
    }
}
