using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;

public static class DependencyInjection
{
    public static IServiceCollection AddRabbitMqMessaging(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<RabbitMqOptions>()
            .Bind(configuration.GetSection(RabbitMqOptions.SectionName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.HostName),
                "RabbitMq:HostName is required.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Exchange),
                "RabbitMq:Exchange is required.")
            .ValidateOnStart();

        services.AddSingleton<RabbitMqConnection>();
        services.AddSingleton<IIntegrationEventPublisher, RabbitMqIntegrationEventPublisher>();

        return services;
    }
}
