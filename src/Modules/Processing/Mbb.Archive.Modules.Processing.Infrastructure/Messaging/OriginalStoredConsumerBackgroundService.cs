using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Application.Jobs.Start;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;

internal sealed class OriginalStoredConsumerBackgroundService : BackgroundService
{
    // Yayıncı taraf JsonSerializerDefaults.Web (camelCase) kullanıyor; aynı
    // sözleşme burada da uygulanmazsa alanlar sessizce boş bağlanır ve mesaj
    // dead-letter kuyruğuna düşer.
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly OriginalStoredConsumerOptions _options;
    private readonly ILogger<OriginalStoredConsumerBackgroundService> _logger;

    public OriginalStoredConsumerBackgroundService(
        RabbitMqConnection rabbitMq,
        IServiceScopeFactory scopeFactory,
        IOptions<OriginalStoredConsumerOptions> options,
        ILogger<OriginalStoredConsumerBackgroundService> logger)
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
                var source =
                    JsonSerializer.Deserialize<DocumentOriginalStoredIntegrationEvent>(payload, JsonOptions)
                    ?? throw new InvalidOperationException("Original-stored event is invalid.");

                await using var scope = _scopeFactory.CreateAsyncScope();

                var handler =
                    scope.ServiceProvider.GetRequiredService<StartProcessingCommandHandler>();

                var result = await handler.Handle(
                    new StartProcessingCommand(
                        source.EventId,
                        source.EventName,
                        source.DocumentId,
                        source.DocumentVersionId,
                        source.OriginalStorageKey,
                        source.Sha256Hash,
                        source.MimeType,
                        source.OccurredAt),
                    stoppingToken);

                if (result.IsSuccess ||
                    result.Error.Code == "processing.version_already_started" ||
                    result.Error.Code == "processing.message_already_processed")
                {
                    await channel.BasicAckAsync(
                        delivery.DeliveryTag,
                        false,
                        stoppingToken);
                    return;
                }

                _logger.LogWarning(
                    "Processing start rejected: {Code} {Description}",
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
                _logger.LogError(ex, "Original-stored consumer failed.");

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
