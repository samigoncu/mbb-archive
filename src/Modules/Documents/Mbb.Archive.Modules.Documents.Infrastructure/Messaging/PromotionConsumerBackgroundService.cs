using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Documents.Application.Documents.PromoteFile;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

internal sealed class PromotionConsumerBackgroundService : BackgroundService
{
    // Yayıncı taraf JsonSerializerDefaults.Web (camelCase) kullanıyor; aynı
    // sözleşme burada da uygulanmazsa alanlar sessizce boş bağlanır ve mesaj
    // dead-letter kuyruğuna düşer.
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly PromotionConsumerOptions _options;
    private readonly ILogger<PromotionConsumerBackgroundService> _logger;

    public PromotionConsumerBackgroundService(
        RabbitMqConnection rabbitMq,
        IServiceScopeFactory scopeFactory,
        IOptions<PromotionConsumerOptions> options,
        ILogger<PromotionConsumerBackgroundService> logger)
    {
        _rabbitMq = rabbitMq;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        await using var channel =
            await _rabbitMq.CreateConsumerChannelAsync(stoppingToken);

        await channel.BasicQosAsync(
            0,
            _options.PrefetchCount,
            false,
            stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (_, delivery) =>
        {
            var payload = delivery.Body.ToArray();

            try
            {
                var integrationEvent =
                    JsonSerializer.Deserialize<DocumentFilePromotionRequestedIntegrationEvent>(payload, JsonOptions)
                    ?? throw new InvalidOperationException("Promotion event payload is invalid.");

                await using var scope = _scopeFactory.CreateAsyncScope();

                var handler =
                    scope.ServiceProvider.GetRequiredService<PromoteDocumentFileCommandHandler>();

                var result = await handler.Handle(
                    new PromoteDocumentFileCommand(
                        integrationEvent.EventId,
                        integrationEvent.EventName,
                        integrationEvent.IngestionId,
                        integrationEvent.DocumentId),
                    stoppingToken);

                if (result.IsSuccess)
                {
                    await channel.BasicAckAsync(
                        delivery.DeliveryTag,
                        false,
                        stoppingToken);
                    return;
                }

                _logger.LogWarning(
                    "Promotion rejected by application rule: {Code} {Description}",
                    result.Error.Code,
                    result.Error.Description);

                await channel.BasicRejectAsync(
                    delivery.DeliveryTag,
                    false,
                    stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Document promotion consumer failed.");

                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

                await channel.BasicNackAsync(
                    delivery.DeliveryTag,
                    false,
                    true,
                    stoppingToken);
            }
        };

        await channel.BasicConsumeAsync(
            _options.Queue,
            false,
            consumer,
            stoppingToken);

        await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
    }
}
