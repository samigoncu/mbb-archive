using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;
using Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Eyp;
using Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure;

public static class OfficialCorrespondenceModule
{
    public static IServiceCollection AddOfficialCorrespondenceModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("OfficialCorrespondence");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'OfficialCorrespondence' is not configured.");
        }

        services.AddDbContext<OfficialCorrespondenceDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IEypStructuralInspector, OpcEypStructuralInspector>();
        services.AddSingleton<IEyp21OfficialValidator, UnavailableEyp21OfficialValidator>();
        services.AddSingleton<IEyp21PackageBuilder, UnavailableEyp21PackageBuilder>();

        services.AddScoped<IEypInspectionRepository, EfEypInspectionRepository>();
        services.AddScoped<IUnitOfWork<OfficialCorrespondenceBoundary>>(
            sp => sp.GetRequiredService<OfficialCorrespondenceDbContext>());
        services.AddScoped<IOutbox<OfficialCorrespondenceBoundary>>(
            sp => sp.GetRequiredService<OfficialCorrespondenceDbContext>());

        services.AddScoped<InspectEypPackageCommandHandler>();
        services.AddScoped<GetEypInspectionQueryHandler>();
        services.AddHostedService<OfficialCorrespondenceOutboxPublisher>();

        return services;
    }
}
