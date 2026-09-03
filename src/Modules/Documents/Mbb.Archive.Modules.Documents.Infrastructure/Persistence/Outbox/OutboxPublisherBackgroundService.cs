using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

internal sealed class OutboxPublisherBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly OutboxPublisherOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<OutboxPublisherBackgroundService> _logger;
    private readonly string _workerId;

    public OutboxPublisherBackgroundService(
        IServiceScopeFactory scopeFactory,
        IIntegrationEventPublisher publisher,
        IOptions<OutboxPublisherOptions> options,
        TimeProvider timeProvider,
        ILogger<OutboxPublisherBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _options = options.Value;
        _timeProvider = timeProvider;
        _logger = logger;

        _workerId =
            $"{Environment.MachineName}:{Environment.ProcessId}:{Guid.CreateVersion7():N}";
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Documents Outbox publisher started as {WorkerId}.",
            _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var publishedCount = await PublishBatchAsync(stoppingToken);

                if (publishedCount == 0)
                    await DelayAsync(stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Broker/database geçici kesintisi API transaction'larını durdurmaz.
                // Outbox kayıtları DB'de kalır ve kontrollü şekilde yeniden denenir.
                _logger.LogError(ex, "Documents Outbox publisher loop failed.");
                await DelayAsync(stoppingToken);
            }
        }
    }

    private async Task<int> PublishBatchAsync(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();

        IReadOnlyList<OutboxEnvelope> messages;

        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            var store = scope.ServiceProvider.GetRequiredService<IOutboxStore>();

            messages = await store.ClaimBatchAsync(
                _workerId,
                now,
                _options.BatchSize,
                TimeSpan.FromSeconds(_options.LeaseSeconds),
                cancellationToken);
        }

        foreach (var message in messages)
            await PublishOneAsync(message, cancellationToken);

        return messages.Count;
    }

    private async Task PublishOneAsync(
        OutboxEnvelope message,
        CancellationToken cancellationToken)
    {
        try
        {
            await _publisher.PublishAsync(
                message.Id,
                message.EventName,
                message.Payload,
                message.OccurredAt,
                cancellationToken);

            await using var scope = _scopeFactory.CreateAsyncScope();
            var store = scope.ServiceProvider.GetRequiredService<IOutboxStore>();

            await store.MarkPublishedAsync(
                message.Id,
                _workerId,
                _timeProvider.GetUtcNow(),
                cancellationToken);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            var now = _timeProvider.GetUtcNow();
            var nextAttempt = now.Add(
                ComputeBackoff(message.AttemptCount + 1));

            _logger.LogWarning(
                ex,
                "Failed publishing Outbox message {MessageId} ({EventName}). Next attempt: {NextAttempt}.",
                message.Id,
                message.EventName,
                nextAttempt);

            await using var scope = _scopeFactory.CreateAsyncScope();
            var store = scope.ServiceProvider.GetRequiredService<IOutboxStore>();

            await store.MarkFailedAsync(
                message.Id,
                _workerId,
                ex.Message,
                now,
                nextAttempt,
                _options.MaxAttempts,
                cancellationToken);
        }
    }

    private TimeSpan ComputeBackoff(int attempt)
    {
        var exponentialSeconds =
            Math.Pow(2, Math.Min(attempt, 20));

        return TimeSpan.FromSeconds(
            Math.Min(
                exponentialSeconds,
                _options.MaxBackoffSeconds));
    }

    private Task DelayAsync(CancellationToken cancellationToken)
        => Task.Delay(
            TimeSpan.FromMilliseconds(
                _options.PollIntervalMilliseconds),
            cancellationToken);
}
