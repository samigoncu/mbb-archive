using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

internal sealed class ProcessingOutboxPublisher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly ProcessingOutboxOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ProcessingOutboxPublisher> _logger;
    private readonly string _workerId;

    public ProcessingOutboxPublisher(
        IServiceScopeFactory scopeFactory,
        IIntegrationEventPublisher publisher,
        IOptions<ProcessingOutboxOptions> options,
        TimeProvider timeProvider,
        ILogger<ProcessingOutboxPublisher> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _options = options.Value;
        _timeProvider = timeProvider;
        _logger = logger;
        _workerId =
            $"{Environment.MachineName}:{Environment.ProcessId}:processing:{Guid.CreateVersion7():N}";
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var count = await PublishBatchAsync(stoppingToken);

                if (count == 0)
                {
                    await Task.Delay(
                        TimeSpan.FromMilliseconds(_options.PollIntervalMilliseconds),
                        stoppingToken);
                }
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Processing Outbox publisher failed.");

                await Task.Delay(
                    TimeSpan.FromMilliseconds(_options.PollIntervalMilliseconds),
                    stoppingToken);
            }
        }
    }

    private async Task<int> PublishBatchAsync(
        CancellationToken cancellationToken)
    {
        IReadOnlyList<ProcessingOutboxEnvelope> messages;

        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            var store =
                scope.ServiceProvider.GetRequiredService<ProcessingOutboxStore>();

            messages = await store.ClaimAsync(
                _workerId,
                _timeProvider.GetUtcNow(),
                _options.BatchSize,
                TimeSpan.FromSeconds(_options.LeaseSeconds),
                cancellationToken);
        }

        foreach (var message in messages)
            await PublishOneAsync(message, cancellationToken);

        return messages.Count;
    }

    private async Task PublishOneAsync(
        ProcessingOutboxEnvelope message,
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
            var store =
                scope.ServiceProvider.GetRequiredService<ProcessingOutboxStore>();

            await store.MarkPublishedAsync(
                message.Id,
                _workerId,
                _timeProvider.GetUtcNow(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            var now = _timeProvider.GetUtcNow();
            var seconds = Math.Min(
                Math.Pow(2, Math.Min(message.AttemptCount + 1, 20)),
                _options.MaxBackoffSeconds);

            await using var scope = _scopeFactory.CreateAsyncScope();
            var store =
                scope.ServiceProvider.GetRequiredService<ProcessingOutboxStore>();

            await store.MarkFailedAsync(
                message.Id,
                _workerId,
                ex.Message,
                now,
                now.AddSeconds(seconds),
                _options.MaxAttempts,
                cancellationToken);
        }
    }
}
