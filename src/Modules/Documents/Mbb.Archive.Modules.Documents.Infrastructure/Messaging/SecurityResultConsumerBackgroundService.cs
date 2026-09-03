using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

internal sealed class SecurityResultConsumerBackgroundService : BackgroundService
{
    // Yayıncı taraf JsonSerializerDefaults.Web (camelCase) kullanıyor; aynı
    // sözleşme burada da uygulanmazsa alanlar sessizce boş bağlanır ve mesaj
    // dead-letter kuyruğuna düşer.
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SecurityResultConsumerOptions _options;
    private readonly ILogger<SecurityResultConsumerBackgroundService> _logger;

    public SecurityResultConsumerBackgroundService(
        RabbitMqConnection rabbitMq,
        IServiceScopeFactory scopeFactory,
        IOptions<SecurityResultConsumerOptions> options,
        ILogger<SecurityResultConsumerBackgroundService> logger)
    {
        _rabbitMq = rabbitMq;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await using var channel =
            await _rabbitMq.CreateConsumerChannelAsync(stoppingToken);

        await channel.BasicQosAsync(
            prefetchSize: 0,
            prefetchCount: _options.PrefetchCount,
            global: false,
            cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (_, delivery) =>
        {
            // RabbitMQ.Client 7.x teslim body belleği callback sonrasında tutulamaz.
            var payload = delivery.Body.ToArray();
            var eventName = delivery.BasicProperties.Type ?? string.Empty;

            try
            {
                var succeeded = await ProcessAsync(
                    eventName,
                    payload,
                    stoppingToken);

                if (succeeded)
                {
                    await channel.BasicAckAsync(
                        delivery.DeliveryTag,
                        multiple: false,
                        cancellationToken: stoppingToken);
                }
                else
                {
                    await channel.BasicRejectAsync(
                        delivery.DeliveryTag,
                        requeue: false,
                        cancellationToken: stoppingToken);
                }
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Security-result consumer failed for event {EventName}.",
                    eventName);

                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);

                await channel.BasicNackAsync(
                    delivery.DeliveryTag,
                    multiple: false,
                    requeue: true,
                    cancellationToken: stoppingToken);
            }
        };

        await channel.BasicConsumeAsync(
            queue: _options.Queue,
            autoAck: false,
            consumer: consumer,
            cancellationToken: stoppingToken);

        await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
    }

    private async Task<bool> ProcessAsync(
        string eventName,
        byte[] payload,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();

        return eventName switch
        {
            "documents.file-security-approved.v1" =>
                await ProcessApprovedAsync(scope.ServiceProvider, payload, cancellationToken),

            "documents.file-security-rejected.v1" =>
                await ProcessRejectedAsync(scope.ServiceProvider, payload, cancellationToken),

            _ => false
        };
    }

    private static async Task<bool> ProcessApprovedAsync(
        IServiceProvider services,
        byte[] payload,
        CancellationToken cancellationToken)
    {
        var integrationEvent =
            JsonSerializer.Deserialize<DocumentFileSecurityApprovedIntegrationEvent>(payload, JsonOptions)
            ?? throw new InvalidOperationException("Approved security event payload is invalid.");

        var handler =
            services.GetRequiredService<ApproveDocumentFileSecurityCommandHandler>();

        var result = await handler.Handle(
            new ApproveDocumentFileSecurityCommand(
                integrationEvent.EventId,
                integrationEvent.IngestionId,
                integrationEvent.DocumentId,
                integrationEvent.EventName,
                integrationEvent.DetectedMimeType,
                integrationEvent.ScannerEngine,
                integrationEvent.ScannerVersion,
                integrationEvent.OccurredAt),
            cancellationToken);

        return result.IsSuccess;
    }

    private static async Task<bool> ProcessRejectedAsync(
        IServiceProvider services,
        byte[] payload,
        CancellationToken cancellationToken)
    {
        var integrationEvent =
            JsonSerializer.Deserialize<DocumentFileSecurityRejectedIntegrationEvent>(payload, JsonOptions)
            ?? throw new InvalidOperationException("Rejected security event payload is invalid.");

        var handler =
            services.GetRequiredService<RejectDocumentFileSecurityCommandHandler>();

        var result = await handler.Handle(
            new RejectDocumentFileSecurityCommand(
                integrationEvent.EventId,
                integrationEvent.IngestionId,
                integrationEvent.DocumentId,
                integrationEvent.EventName,
                integrationEvent.ReasonCode,
                integrationEvent.Detail,
                integrationEvent.ThreatName,
                integrationEvent.DetectedMimeType,
                integrationEvent.OccurredAt),
            cancellationToken);

        return result.IsSuccess;
    }
}
