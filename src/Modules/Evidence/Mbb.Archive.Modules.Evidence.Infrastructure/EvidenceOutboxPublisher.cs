using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Evidence.Infrastructure;

internal sealed class EvidenceOutboxPublisher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly ILogger<EvidenceOutboxPublisher> _logger;

    public EvidenceOutboxPublisher(
        IServiceScopeFactory scopeFactory,
        IIntegrationEventPublisher publisher,
        ILogger<EvidenceOutboxPublisher> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PublishBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Evidence Outbox cycle failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task PublishBatchAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<EvidenceDbContext>();

        var messages = await db.OutboxMessages
            .OrderBy(x => x.OccurredAt)
            .Take(50)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            await _publisher.PublishAsync(
                message.Id,
                message.EventName,
                message.Payload,
                message.OccurredAt,
                ct);

            db.OutboxMessages.Remove(message);
        }

        await db.SaveChangesAsync(ct);
    }
}
