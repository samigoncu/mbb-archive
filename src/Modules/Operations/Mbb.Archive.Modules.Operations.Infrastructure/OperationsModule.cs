using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Operations.Application;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Commands;
using Mbb.Archive.Modules.Operations.Application.Queries;
using Mbb.Archive.Modules.Operations.Application.Alerts;
using Mbb.Archive.Modules.Operations.Application.Branding;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;
using Mbb.Archive.Modules.Operations.Infrastructure.Probes;
using Mbb.Archive.Modules.Operations.Infrastructure.Notifications;
using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Application.Automation;
using Mbb.Archive.Modules.Operations.Infrastructure.Automation;

namespace Mbb.Archive.Modules.Operations.Infrastructure;

public static class OperationsModule
{
    public static IServiceCollection AddOperationsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("Operations");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Operations' is not configured.");

        services.AddDbContext<OperationsDbContext>(
            options => options.UseNpgsql(connectionString));

        services
            .AddOptions<OperationsProbeOptions>()
            .Bind(configuration.GetSection(OperationsProbeOptions.SectionName))
            .ValidateOnStart();

        services.AddHttpClient<RabbitMqManagementProbe>();
        services.AddHttpClient<OpenSearchProbe>();
        services.AddOptions<WebhookNotificationOptions>().Bind(configuration.GetSection("Operations:Notifications:Webhook"));
        services.AddHttpClient<WebhookNotificationChannel>(http => http.Timeout = TimeSpan.FromSeconds(30))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddScoped<INotificationChannel>(sp => sp.GetRequiredService<WebhookNotificationChannel>());
        services.AddOptions<EmailNotificationOptions>().Bind(configuration.GetSection(EmailNotificationOptions.SectionName));
        services.AddScoped<EmailNotificationChannel>();
        services.AddScoped<INotificationChannel>(sp => sp.GetRequiredService<EmailNotificationChannel>());
        services.AddScoped<MalatyaSmsNotificationChannel>();
        services.AddScoped<INotificationChannel>(sp => sp.GetRequiredService<MalatyaSmsNotificationChannel>());

        services.AddSingleton(TimeProvider.System);

        services.AddScoped<IOperationsRepository, EfOperationsRepository>();
        services.AddScoped<IOperationsQueries, EfOperationsRepository>();

        services.AddScoped<IUnitOfWork<OperationsBoundary>>(
            sp => sp.GetRequiredService<OperationsDbContext>());

        services.AddScoped<IOperationsOverviewProvider, OperationsOverviewProvider>();
        services.AddScoped<IBrandingStore, BrandingStore>();
        services.AddScoped<BrandingHandler>();
        services.AddScoped<OperationsCommandHandlers>();
        services.AddScoped<OperationsQueryHandlers>();
        services.AddScoped<AlertCommandHandlers>();
        services.AddScoped<AlertQueryHandlers>();

        services.AddOptions<OperationsAutomationOptions>().Bind(configuration.GetSection(OperationsAutomationOptions.SectionName));
        services.AddScoped<NotificationDispatcher>();
        services.AddScoped<OperationsAutomationService>();
        services.AddScoped<IOperationsAutomation>(sp => sp.GetRequiredService<OperationsAutomationService>());
        services.AddScoped<Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor, OperationsStateContributor>();
        services.AddHostedService<OperationsAutomationWorker>();
        services.AddHostedService<OperationsAuditPublisher>();
        services.AddHostedService<OperationalMetricsPublisher>();

        return services;
    }
}
