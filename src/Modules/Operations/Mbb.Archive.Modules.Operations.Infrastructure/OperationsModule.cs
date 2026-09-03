using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Operations.Application;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Commands;
using Mbb.Archive.Modules.Operations.Application.Queries;
using Mbb.Archive.Modules.Operations.Application.Alerts;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;
using Mbb.Archive.Modules.Operations.Infrastructure.Probes;
using Mbb.Archive.Modules.Operations.Infrastructure.Notifications;
using Mbb.Archive.Modules.Operations.Application.Notifications;

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
        services.AddHttpClient<WebhookNotificationChannel>();
        services.AddScoped<INotificationChannel>(sp => sp.GetRequiredService<WebhookNotificationChannel>());
        services.AddOptions<EmailNotificationOptions>().Bind(configuration.GetSection(EmailNotificationOptions.SectionName));
        services.AddScoped<EmailNotificationChannel>();
        services.AddScoped<INotificationChannel>(sp => sp.GetRequiredService<EmailNotificationChannel>());

        services.AddSingleton(TimeProvider.System);

        services.AddScoped<IOperationsRepository, EfOperationsRepository>();
        services.AddScoped<IOperationsQueries, EfOperationsRepository>();

        services.AddScoped<IUnitOfWork<OperationsBoundary>>(
            sp => sp.GetRequiredService<OperationsDbContext>());

        services.AddScoped<IOperationsOverviewProvider, OperationsOverviewProvider>();
        services.AddScoped<OperationsCommandHandlers>();
        services.AddScoped<OperationsQueryHandlers>();
        services.AddScoped<AlertCommandHandlers>();
        services.AddScoped<AlertQueryHandlers>();

        services.AddHostedService<OperationalMetricsPublisher>();

        return services;
    }
}
