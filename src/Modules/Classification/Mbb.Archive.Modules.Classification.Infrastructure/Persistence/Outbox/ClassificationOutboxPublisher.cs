using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Outbox;

internal sealed class ClassificationOutboxPublisher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly ClassificationOutboxOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ClassificationOutboxPublisher> _logger;
    private readonly string _workerId;

    public ClassificationOutboxPublisher(
        IServiceScopeFactory scopeFactory,
        IIntegrationEventPublisher publisher,
        IOptions<ClassificationOutboxOptions> options,
        TimeProvider timeProvider,
        ILogger<ClassificationOutboxPublisher> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _options = options.Value;
        _timeProvider = timeProvider;
        _logger = logger;
        _workerId = $"{Environment.MachineName}:{Environment.ProcessId}:classification:{Guid.CreateVersion7():N}";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messages = await ClaimAsync(stoppingToken);

                foreach (var message in messages)
                    await PublishAsync(message, stoppingToken);

                if (messages.Count == 0)
                    await DelayAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Classification Outbox publisher failed.");
                await DelayAsync(stoppingToken);
            }
        }
    }

    private async Task<IReadOnlyList<OutboxEnvelope>> ClaimAsync(
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ClassificationDbContext>();
        var now = _timeProvider.GetUtcNow();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var messages = await db.OutboxMessages
            .FromSqlInterpolated(
                $"""
                SELECT * FROM classification.outbox_messages
                WHERE processed_at IS NULL
                  AND dead_lettered_at IS NULL
                  AND next_attempt_at <= {now}
                  AND (locked_until IS NULL OR locked_until < {now})
                ORDER BY occurred_at
                LIMIT {_options.BatchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(cancellationToken);

        var lockedUntil = now.AddSeconds(_options.LeaseSeconds);
        foreach (var message in messages)
            message.Lease(_workerId, lockedUntil);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return messages.Select(x => new OutboxEnvelope(
            x.Id,
            x.EventName,
            x.Payload,
            x.OccurredAt,
            x.AttemptCount)).ToArray();
    }

    private async Task PublishAsync(
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

            await MarkPublishedAsync(message.Id, cancellationToken);
        }
        catch (Exception ex)
        {
            await MarkFailedAsync(message, ex.Message, cancellationToken);
        }
    }

    private async Task MarkPublishedAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ClassificationDbContext>();
        var message = await db.OutboxMessages.SingleAsync(x => x.Id == id, cancellationToken);
        message.MarkPublished(_workerId, _timeProvider.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkFailedAsync(
        OutboxEnvelope envelope,
        string error,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ClassificationDbContext>();
        var message = await db.OutboxMessages.SingleAsync(x => x.Id == envelope.Id, cancellationToken);
        var now = _timeProvider.GetUtcNow();
        var seconds = Math.Min(
            Math.Pow(2, Math.Min(envelope.AttemptCount + 1, 20)),
            _options.MaxBackoffSeconds);

        message.MarkFailed(
            _workerId,
            error,
            now,
            now.AddSeconds(seconds),
            _options.MaxAttempts);

        await db.SaveChangesAsync(cancellationToken);
    }

    private Task DelayAsync(CancellationToken cancellationToken)
        => Task.Delay(
            TimeSpan.FromMilliseconds(_options.PollIntervalMilliseconds),
            cancellationToken);

    private sealed record OutboxEnvelope(
        Guid Id,
        string EventName,
        string Payload,
        DateTimeOffset OccurredAt,
        int AttemptCount);
}
