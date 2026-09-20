using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;
namespace Mbb.Archive.Modules.Operations.Infrastructure.Automation;
internal sealed class OperationsAuditPublisher(IServiceScopeFactory scopes, IIntegrationEventPublisher publisher,
    ILogger<OperationsAuditPublisher> logger, TimeProvider time) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<OperationsDbContext>();
                await using var tx = await db.Database.BeginTransactionAsync(ct);
                await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855304)", ct);
                var pending = await db.AutomationEvents.Where(x => x.AuditPublishedAt == null).OrderBy(x => x.OccurredAt).Take(50).ToListAsync(ct);
                foreach (var item in pending)
                {
                    var eventName = $"operations.{item.Kind}.v1";
                    var payload = JsonSerializer.Serialize(new { eventId = item.Id, eventName, occurredAt = item.OccurredAt,
                        actor = item.Actor, entityType = "operations", entityId = item.EntityId, detail = item.Detail });
                    await publisher.PublishAsync(item.Id, eventName, payload, item.OccurredAt, ct);
                    item.AuditPublishedAt = time.GetUtcNow();
                }
                await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Operations audit publication failed; persisted events will retry."); }
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
