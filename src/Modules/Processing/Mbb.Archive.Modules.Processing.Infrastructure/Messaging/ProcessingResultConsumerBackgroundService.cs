using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Processing.Application.Jobs.Results;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;

internal sealed class ProcessingResultConsumerBackgroundService
    : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ProcessingResultConsumerOptions _options;
    private readonly ILogger<ProcessingResultConsumerBackgroundService> _logger;

    public ProcessingResultConsumerBackgroundService(
        RabbitMqConnection rabbitMq,
        IServiceScopeFactory scopeFactory,
        IOptions<ProcessingResultConsumerOptions> options,
        ILogger<ProcessingResultConsumerBackgroundService> logger)
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
            prefetchSize: 0,
            prefetchCount: _options.PrefetchCount,
            global: false,
            cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (_, delivery) =>
        {
            // RabbitMQ.Client 7.x body memory is only valid during this callback.
            var body = delivery.Body.ToArray();
            var eventName = delivery.BasicProperties.Type ?? string.Empty;

            try
            {
                var succeeded = await ProcessAsync(
                    eventName,
                    body,
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
                    // A deterministic business/contract rejection goes to DLQ.
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
                    "Processing result consumer failed for {EventName}.",
                    eventName);

                await Task.Delay(
                    TimeSpan.FromSeconds(3),
                    stoppingToken);

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

        await Task.Delay(
            Timeout.InfiniteTimeSpan,
            stoppingToken);
    }

    private async Task<bool> ProcessAsync(
        string eventName,
        byte[] body,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var services = scope.ServiceProvider;

        return eventName switch
        {
            "processing.pdf-inspection-completed.v1" =>
                await ProcessPdfCompletedAsync(
                    services,
                    body,
                    cancellationToken),

            "processing.pdf-inspection-failed.v1" =>
                await ProcessPdfFailedAsync(
                    services,
                    body,
                    cancellationToken),

            "processing.ocr-completed.v1" =>
                await ProcessOcrCompletedAsync(
                    services,
                    body,
                    cancellationToken),

            "processing.ocr-failed.v1" =>
                await ProcessOcrFailedAsync(
                    services,
                    body,
                    cancellationToken),

            _ => false
        };
    }

    private static async Task<bool> ProcessPdfCompletedAsync(
        IServiceProvider services,
        byte[] body,
        CancellationToken cancellationToken)
    {
        var integrationEvent = Deserialize<PdfInspectionCompletedIntegrationEvent>(body);
        var handler = services.GetRequiredService<ApplyPdfInspectionResultCommandHandler>();

        var result = await handler.Handle(
            new ApplyPdfInspectionResultCommand(
                integrationEvent.EventId,
                integrationEvent.EventName,
                integrationEvent.ProcessingJobId,
                integrationEvent.PageCount,
                integrationEvent.PdfVersion,
                integrationEvent.IsEncrypted,
                integrationEvent.HasEmbeddedText,
                integrationEvent.RequiresOcr,
                integrationEvent.Engine,
                integrationEvent.EngineVersion,
                integrationEvent.TextArtifact,
                integrationEvent.JsonArtifact,
                integrationEvent.OccurredAt),
            cancellationToken);

        return result.IsSuccess;
    }

    private static Task<bool> ProcessPdfFailedAsync(
        IServiceProvider services,
        byte[] body,
        CancellationToken cancellationToken)
    {
        var integrationEvent = Deserialize<PdfInspectionFailedIntegrationEvent>(body);

        return ProcessFailureAsync(
            services,
            integrationEvent.EventId,
            integrationEvent.EventName,
            integrationEvent.ProcessingJobId,
            integrationEvent.FailureCode,
            integrationEvent.FailureDetail,
            integrationEvent.OccurredAt,
            cancellationToken);
    }

    private static async Task<bool> ProcessOcrCompletedAsync(
        IServiceProvider services,
        byte[] body,
        CancellationToken cancellationToken)
    {
        var integrationEvent = Deserialize<OcrCompletedIntegrationEvent>(body);
        var handler = services.GetRequiredService<ApplyOcrResultCommandHandler>();

        var result = await handler.Handle(
            new ApplyOcrResultCommand(
                integrationEvent.EventId,
                integrationEvent.EventName,
                integrationEvent.ProcessingJobId,
                integrationEvent.Engine,
                integrationEvent.EngineVersion,
                integrationEvent.Languages,
                integrationEvent.PageCount,
                integrationEvent.AverageConfidence,
                integrationEvent.TextArtifact,
                integrationEvent.JsonArtifact,
                integrationEvent.SearchablePdfArtifact,
                integrationEvent.OccurredAt),
            cancellationToken);

        return result.IsSuccess;
    }

    private static Task<bool> ProcessOcrFailedAsync(
        IServiceProvider services,
        byte[] body,
        CancellationToken cancellationToken)
    {
        var integrationEvent = Deserialize<OcrFailedIntegrationEvent>(body);

        return ProcessFailureAsync(
            services,
            integrationEvent.EventId,
            integrationEvent.EventName,
            integrationEvent.ProcessingJobId,
            integrationEvent.FailureCode,
            integrationEvent.FailureDetail,
            integrationEvent.OccurredAt,
            cancellationToken);
    }

    private static async Task<bool> ProcessFailureAsync(
        IServiceProvider services,
        Guid messageId,
        string eventName,
        Guid processingJobId,
        string failureCode,
        string failureDetail,
        DateTimeOffset occurredAt,
        CancellationToken cancellationToken)
    {
        var handler = services.GetRequiredService<FailProcessingCommandHandler>();

        var result = await handler.Handle(
            new FailProcessingCommand(
                messageId,
                eventName,
                processingJobId,
                failureCode,
                failureDetail,
                occurredAt),
            cancellationToken);

        return result.IsSuccess;
    }

    private static T Deserialize<T>(byte[] body)
        where T : class
        => JsonSerializer.Deserialize<T>(body, JsonOptions)
           ?? throw new InvalidOperationException(
               $"Integration event payload is invalid for {typeof(T).Name}.");
}
