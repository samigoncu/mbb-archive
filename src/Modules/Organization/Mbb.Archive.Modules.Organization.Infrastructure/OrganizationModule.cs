using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Application.Units;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Organization.Infrastructure;

public static class OrganizationModule
{
    public static IServiceCollection AddOrganizationModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Organization");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Organization' is not configured.");

        services.AddDbContext<OrganizationDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);

        services
            .AddOptions<LdapOptions>()
            .Bind(configuration.GetSection(LdapOptions.SectionName));

        services.AddScoped<EfOrganizationRepository>();
        services.AddScoped<IOrganizationRepository>(sp => sp.GetRequiredService<EfOrganizationRepository>());
        services.AddScoped<IOrganizationQueries>(sp => sp.GetRequiredService<EfOrganizationRepository>());

        services.AddScoped<IUnitOfWork<OrganizationBoundary>>(
            sp => sp.GetRequiredService<OrganizationDbContext>());

        services.AddScoped<LdapDirectoryClient>();
        services.AddScoped<IDirectoryClient, DirectoryClientRouter>();
        services.AddScoped<ILdapConnectionTester, LdapConnectionTester>();

        services.AddHttpClient<IMalatyaApiClient, MalatyaApiClient>();
        services.AddScoped<IMalatyaApiSettingsStore, EfMalatyaApiSettingsStore>();
        services.AddScoped<MalatyaApiSettingsHandlers>();

        services.AddScoped<EfUnitPlanAssignments>();
        services.AddScoped<IUnitPlanAssignments>(sp => sp.GetRequiredService<EfUnitPlanAssignments>());
        services.AddScoped<Mbb.Archive.Modules.Classification.Contracts.IUnitFilePlanPolicy>(sp => sp.GetRequiredService<EfUnitPlanAssignments>());
        services.AddScoped<UnitAdministrationHandlers>();
        // Teşkilat seviyeleri artık veri; katalog yönetimi kendi servisinde.
        services.AddScoped<Application.Units.IUnitTypeStore, Persistence.EfUnitTypeStore>();
        services.AddScoped<Application.Units.UnitTypeHandlers>();
        services.AddScoped<OrganizationCommandHandlers>();
        services.AddScoped<Mbb.Archive.BuildingBlocks.Application.Security.IFilePlanCodeUsage, Persistence.OrganizationFilePlanUsage>();
        // LDAP ayarı artık veritabanında; parola şifreli, anlık görüntü
        // yönetim ekranındaki değişiklikten sonra tazelenir.
        services.AddScoped<Application.Directory.IDirectorySettingsStore, Directory.EfDirectorySettingsStore>();
        services.AddSingleton<Application.Directory.IDirectorySecretProtector, Directory.DirectorySecretProtector>();
        services.AddSingleton<Application.Directory.IDirectoryRuntime, Directory.DirectoryRuntime>();
        services.AddHostedService<Directory.DirectoryRuntimeRefresher>();
        services.AddScoped<Application.Directory.DirectorySettingsHandlers>();
        // Giriş ve yönetici eşitlemesi aynı upsert'ten geçsin diye tek servis.
        services.AddScoped<Application.Directory.IDirectoryUserStore, Directory.EfDirectoryUserStore>();
        services.AddScoped<Application.Directory.IDirectoryLookup, Directory.LdapDirectoryLookup>();
        services.AddScoped<Application.Directory.DirectoryUserProvisioning>();
        services.AddScoped<Application.Directory.DirectoryUserHandlers>();
        services.AddScoped<OrganizationQueryHandlers>();
        services.AddScoped<DirectorySyncService>();
        services.AddScoped<Mbb.Archive.Modules.Organization.Application.Directory.IDirectoryAdministration, DirectoryAdministration>();

        return services;
    }
}
