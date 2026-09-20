using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Application.Entities;
using Mbb.Archive.Modules.Geo.Infrastructure.Persistence;
using Mbb.Archive.Modules.Geo.Infrastructure.Providers;

using Mbb.Archive.Modules.Geo.Application.Services;

namespace Mbb.Archive.Modules.Geo.Infrastructure;

public static class GeoModule
{
    public static IServiceCollection AddGeoModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Geo");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Geo' is not configured.");

        services.AddDbContext<GeoDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);

        services
            .AddOptions<GeoOptions>()
            .Bind(configuration.GetSection(GeoOptions.SectionName));

        services.AddHttpClient("geo-wfs");
        services.AddHttpClient("geo-wms");
        services.AddHttpClient(nameof(GeoCapabilitiesReader));

        services.AddScoped<EfGeoRepository>();
        services.AddScoped<IGeoRepository>(sp => sp.GetRequiredService<EfGeoRepository>());
        services.AddScoped<IGeoQueries>(sp => sp.GetRequiredService<EfGeoRepository>());

        services.AddScoped<IUnitOfWork<GeoBoundary>>(
            sp => sp.GetRequiredService<GeoDbContext>());

        services.AddScoped<IOutbox<GeoBoundary>>(
            sp => sp.GetRequiredService<GeoDbContext>());

        services.AddHostedService<GeoOutboxPublisher>();

        services.AddScoped<IGeoFeatureProvider, WfsGeoFeatureProvider>();
        services.AddSingleton<IGeoMapSettings, GeoMapSettingsProvider>();

        // Yönetim ekranından gelen CBS yapılandırması: saklama, şifreleme,
        // katman keşfi ve çalışma anındaki anlık görüntü.
        services.AddScoped<IGeoServiceStore, EfGeoServiceStore>();
        services.AddSingleton<IGeoSecretProtector, GeoSecretProtector>();
        services.AddScoped<IGeoCapabilitiesReader, GeoCapabilitiesReader>();
        services.AddSingleton<IGeoRuntimeConfiguration, GeoRuntimeConfiguration>();
        services.AddSingleton<IGeoWmsProxy, GeoWmsProxy>();
        services.AddHostedService<GeoRuntimeRefresher>();
        services.AddScoped<GeoAdminHandler>();

        services.AddScoped<GeoQueryHandlers>();
        services.AddScoped<SetGeoEntityActiveHandler>();
        services.AddScoped<ImportProviderFeatureHandler>();
        services.AddScoped<GeoCommandHandlers>();

        return services;
    }
}
