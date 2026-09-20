using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Worker.SecurityScan;

internal sealed class SecurityScanWorker : BackgroundService
{
    // Yayıncı taraf JsonSerializerDefaults.Web (camelCase) kullanıyor; aynı
    // sözleşme burada da uygulanmazsa alanlar sessizce null bağlanır.
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private const string ApprovedEventKind = "security-approved-v1";
    private const string RejectedEventKind = "security-rejected-v1";

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly StagingFileReader _files;
    private readonly FileSignatureDetector _signatureDetector;
    private readonly ClamAvClient _clamAv;
    private readonly SecurityScanOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<SecurityScanWorker> _logger;

    public SecurityScanWorker(
        RabbitMqConnection rabbitMq,
        IIntegrationEventPublisher publisher,
        StagingFileReader files,
        FileSignatureDetector signatureDetector,
        ClamAvClient clamAv,
        IOptions<SecurityScanOptions> options,
        TimeProvider timeProvider,
        ILogger<SecurityScanWorker> logger)
    {
        _rabbitMq = rabbitMq;
        _publisher = publisher;
        _files = files;
        _signatureDetector = signatureDetector;
        _clamAv = clamAv;
        _options = options.Value;
        _timeProvider = timeProvider;
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
                await ScanAndPublishAsync(payload, stoppingToken);

                await channel.BasicAckAsync(
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
                _logger.LogError(
                    ex,
                    "Security scan infrastructure failure. Message will be requeued.");

                // Prefetch=1 + bounded delay prevents a tight redelivery loop while ClamAV
                // or shared staging storage is temporarily unavailable.
                await Task.Delay(
                    TimeSpan.FromSeconds(_options.RetryDelaySeconds),
                    stoppingToken);

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

    private async Task ScanAndPublishAsync(
        byte[] payload,
        CancellationToken cancellationToken)
    {
        var staged =
            JsonSerializer.Deserialize<DocumentFileStagedIntegrationEvent>(payload, JsonOptions)
            ?? throw new InvalidOperationException("Staged-file integration event is invalid.");

        await using var file = _files.OpenRead(staged.StorageKey);

        var detectedMimeType =
            await _signatureDetector.DetectAsync(file, cancellationToken);

        if (detectedMimeType is null)
        {
            await PublishRejectedAsync(
                staged,
                "unsupported_signature",
                "File signature could not be identified.",
                threatName: null,
                detectedMimeType: null,
                cancellationToken);

            return;
        }

        var scan = await _clamAv.ScanAsync(file, cancellationToken);

        if (!scan.IsClean)
        {
            var limitExceeded = scan.ThreatName?.StartsWith("Heuristics.Limits.Exceeded", StringComparison.Ordinal) == true;
            await PublishRejectedAsync(
                staged,
                limitExceeded ? "security_scan_limit_exceeded" : "malware_detected",
                limitExceeded ? "Dosya güvenlik tarayıcısının kapasite sınırını aştı. Tarama tamamlanmadığı için dosya kabul edilmedi." : "ClamAV detected malicious content.",
                scan.ThreatName,
                detectedMimeType,
                cancellationToken);

            return;
        }

        var occurredAt = _timeProvider.GetUtcNow();

        var approved =
            new DocumentFileSecurityApprovedIntegrationEvent(
                DeterministicEventId.Create(staged.EventId, ApprovedEventKind),
                staged.EventId,
                staged.IngestionId,
                staged.DocumentId,
                detectedMimeType,
                "ClamAV",
                "1.5.4",
                occurredAt);

        await _publisher.PublishAsync(
            approved.EventId,
            approved.EventName,
            JsonSerializer.Serialize(approved, JsonOptions),
            approved.OccurredAt,
            cancellationToken);
    }

    private Task PublishRejectedAsync(
        DocumentFileStagedIntegrationEvent staged,
        string reasonCode,
        string detail,
        string? threatName,
        string? detectedMimeType,
        CancellationToken cancellationToken)
    {
        var occurredAt = _timeProvider.GetUtcNow();

        var rejected =
            new DocumentFileSecurityRejectedIntegrationEvent(
                DeterministicEventId.Create(staged.EventId, RejectedEventKind),
                staged.EventId,
                staged.IngestionId,
                staged.DocumentId,
                reasonCode,
                detail,
                threatName,
                detectedMimeType,
                occurredAt);

        return _publisher.PublishAsync(
            rejected.EventId,
            rejected.EventName,
            JsonSerializer.Serialize(rejected, JsonOptions),
            rejected.OccurredAt,
            cancellationToken);
    }
}
