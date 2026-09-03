using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Workflow.Application;

namespace Mbb.Archive.Modules.Workflow.Infrastructure;

internal sealed class WorkflowOutboxMessage
{
    private WorkflowOutboxMessage() { }

    internal WorkflowOutboxMessage(
        Guid id,
        string eventName,
        string payload,
        DateTimeOffset occurredAt)
    {
        Id = id;
        EventName = eventName;
        Payload = payload;
        OccurredAt = occurredAt;
        NextAttemptAt = occurredAt;
    }

    public Guid Id { get; private set; }
    public string EventName { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset NextAttemptAt { get; private set; }
    public DateTimeOffset? ProcessedAt { get; private set; }
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }

    public void MarkPublished(DateTimeOffset now)
    {
        ProcessedAt = now;
        LastError = null;
    }

    public void MarkFailed(string error, DateTimeOffset nextAttemptAt)
    {
        AttemptCount++;
        LastError = error.Length <= 4000 ? error : error[..4000];
        NextAttemptAt = nextAttemptAt;
    }
}

internal sealed class WorkflowOutboxPublisher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IIntegrationEventPublisher _publisher;
    private readonly TimeProvider _time;
    private readonly ILogger<WorkflowOutboxPublisher> _logger;

    public WorkflowOutboxPublisher(
        IServiceScopeFactory scopeFactory,
        IIntegrationEventPublisher publisher,
        TimeProvider time,
        ILogger<WorkflowOutboxPublisher> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _time = time;
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
                _logger.LogError(ex, "Workflow Outbox cycle failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task PublishBatchAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
        var now = _time.GetUtcNow();

        var messages = await db.OutboxMessages
            .Where(x => x.ProcessedAt == null && x.NextAttemptAt <= now)
            .OrderBy(x => x.OccurredAt)
            .Take(50)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            try
            {
                await _publisher.PublishAsync(
                    message.Id,
                    message.EventName,
                    message.Payload,
                    message.OccurredAt,
                    ct);
                message.MarkPublished(_time.GetUtcNow());
            }
            catch (Exception ex)
            {
                var seconds = Math.Min(
                    Math.Pow(2, Math.Min(message.AttemptCount + 1, 8)),
                    300);
                message.MarkFailed(ex.Message, _time.GetUtcNow().AddSeconds(seconds));
            }
        }

        await db.SaveChangesAsync(ct);
    }
}

internal sealed class WorkflowMonitorService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _time;
    private readonly ILogger<WorkflowMonitorService> _logger;

    public WorkflowMonitorService(
        IServiceScopeFactory scopeFactory,
        TimeProvider time,
        ILogger<WorkflowMonitorService> logger)
    {
        _scopeFactory = scopeFactory;
        _time = time;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Workflow timer/SLA cycle failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task ProcessAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<IWorkflowRepository>();
        var handler = scope.ServiceProvider.GetRequiredService<WorkflowCommandHandlers>();
        var now = _time.GetUtcNow();

        var timers = await repo.GetDueTimerInstanceIdsAsync(now, 50, ct);
        foreach (var id in timers)
            await handler.Handle(new ResumeWorkflowTimerCommand(id), ct);

        var overdue = await repo.GetOverdueTaskInstanceIdsAsync(now, 50, ct);
        foreach (var id in overdue)
            await handler.Handle(new EscalateWorkflowTaskCommand(id), ct);
    }
}
