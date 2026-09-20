using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence;

/// <summary>
/// Geo outbox yayıncısı. Satırlar `FOR UPDATE SKIP LOCKED` ile kiralanır;
/// birden çok örnek aynı olayı iki kez yayınlamaz.
/// </summary>
internal sealed class GeoOutboxPublisher : BackgroundService
{
    private const int BatchSize = 50;
    private const int MaxAttempts = 10;
    private const int LeaseSeconds = 120;

    private readonly IServiceScopeFactory _scopes;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly TimeProvider _time;
    private readonly string _worker = $"geo:{Environment.MachineName}:{Guid.CreateVersion7():N}";

    public GeoOutboxPublisher(
        IServiceScopeFactory scopes,
        IIntegrationEventPublisher publisher,
        TimeProvider time)
    {
        _scopes = scopes;
        _publisher = publisher;
        _time = time;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var batch = await ClaimAsync(stoppingToken);

                foreach (var message in batch)
                    await PublishAsync(message, stoppingToken);

                if (batch.Count == 0)
                    await Task.Delay(1000, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch
            {
                await Task.Delay(1000, stoppingToken);
            }
        }
    }

    private async Task<IReadOnlyList<Pending>> ClaimAsync(CancellationToken ct)
    {
        await using var scope = _scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GeoDbContext>();
        var now = _time.GetUtcNow();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var rows = await db.Outbox
            .FromSqlInterpolated($"""
                SELECT * FROM geo.outbox_messages
                WHERE processed_at IS NULL
                  AND dead_lettered_at IS NULL
                  AND next_attempt_at <= {now}
                  AND (locked_until IS NULL OR locked_until < {now})
                ORDER BY occurred_at
                LIMIT {BatchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(ct);

        foreach (var row in rows)
            row.Lease(_worker, now.AddSeconds(LeaseSeconds));

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return rows
            .Select(x => new Pending(x.Id, x.EventName, x.Payload, x.OccurredAt, x.AttemptCount))
            .ToArray();
    }

    private async Task PublishAsync(Pending message, CancellationToken ct)
    {
        try
        {
            await _publisher.PublishAsync(
                message.Id,
                message.EventName,
                message.Payload,
                message.OccurredAt,
                ct);

            await using var scope = _scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GeoDbContext>();
            var row = await db.Outbox.SingleAsync(x => x.Id == message.Id, ct);
            row.Published(_worker, _time.GetUtcNow());
            await db.SaveChangesAsync(ct);
        }
        catch (Exception exception)
        {
            await using var scope = _scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<GeoDbContext>();
            var row = await db.Outbox.SingleAsync(x => x.Id == message.Id, ct);
            var now = _time.GetUtcNow();

            row.Failed(
                _worker,
                exception.Message,
                now,
                now.AddSeconds(Math.Min(Math.Pow(2, message.Attempt + 1), 300)),
                MaxAttempts);

            await db.SaveChangesAsync(ct);
        }
    }

    private sealed record Pending(
        Guid Id,
        string EventName,
        string Payload,
        DateTimeOffset OccurredAt,
        int Attempt);
}
