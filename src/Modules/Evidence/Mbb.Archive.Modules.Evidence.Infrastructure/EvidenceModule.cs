using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Application.Validations;
using Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;
using Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;
using Mbb.Archive.Modules.Evidence.Infrastructure.Timestamp;

namespace Mbb.Archive.Modules.Evidence.Infrastructure;

public static class EvidenceModule
{
    public static IServiceCollection AddEvidenceModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Evidence");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Evidence' is not configured.");

        services.AddDbContext<EvidenceDbContext>(
            options => options.UseNpgsql(connectionString));

        services
            .AddOptions<TimestampAuthorityOptions>()
            .Bind(configuration.GetSection(TimestampAuthorityOptions.SectionName))
            .Validate(options => options.TimeoutSeconds is > 0 and <= 120,
                "Timestamp authority timeout must be between 1 and 120 seconds.")
            .ValidateOnStart();

        services.AddHttpClient<IRfc3161TimestampClient, HttpRfc3161TimestampClient>();

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<CertificateTrustEvaluator>();
        services.AddSingleton<ICmsSignatureValidator, DotNetCmsSignatureValidator>();
        services.AddSingleton<IRfc3161TimestampValidator, DotNetRfc3161TimestampValidator>();
        services.Configure<DssValidationOptions>(configuration.GetSection("Evidence:PdfValidation:Dss"));
        services.AddHttpClient<IPdfSignatureValidator, DssPdfSignatureValidator>()
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

        services.AddScoped<EfEvidenceRepository>();
        services.AddScoped<IEvidenceRepository>(
            sp => sp.GetRequiredService<EfEvidenceRepository>());
        services.AddScoped<IEvidenceQueries>(
            sp => sp.GetRequiredService<EfEvidenceRepository>());
        services.AddScoped<IUnitOfWork<EvidenceBoundary>>(
            sp => sp.GetRequiredService<EvidenceDbContext>());
        services.AddScoped<IOutbox<EvidenceBoundary>>(
            sp => sp.GetRequiredService<EvidenceDbContext>());

        services.AddScoped<EvidenceCommandHandlers>();
        services.AddScoped<GetEvidenceValidationQueryHandler>();
        services.AddScoped<GetEvidenceValidationsQueryHandler>();
        services.AddHostedService<EvidenceOutboxPublisher>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            EvidenceOperationalSnapshotContributor>();

        return services;
    }
}
