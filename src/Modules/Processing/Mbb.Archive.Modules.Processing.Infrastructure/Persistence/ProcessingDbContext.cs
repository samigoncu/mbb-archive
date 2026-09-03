using Mbb.Archive.Modules.Processing.Application;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Inbox;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence;

public sealed class ProcessingDbContext :
    DbContext,
    IUnitOfWork<ProcessingBoundary>,
    IOutbox<ProcessingBoundary>,
    IInbox<ProcessingBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public ProcessingDbContext(
        DbContextOptions<ProcessingDbContext> options)
        : base(options)
    {
    }

    internal DbSet<ProcessingJob> Jobs => Set<ProcessingJob>();
    internal DbSet<InboxMessage> InboxMessages => Set<InboxMessage>();
    internal DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public Task<bool> HasProcessedAsync(
        Guid messageId,
        CancellationToken cancellationToken)
        => InboxMessages
            .AsNoTracking()
            .AnyAsync(x => x.Id == messageId, cancellationToken);

    public void MarkProcessed(
        Guid messageId,
        string eventName,
        DateTimeOffset processedAt)
        => InboxMessages.Add(
            new InboxMessage(
                messageId,
                eventName,
                processedAt));

    public void Enqueue(IIntegrationEvent integrationEvent)
        => _pendingEvents.Add(integrationEvent);

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        AddOutboxMessages();

        try
        {
            var result = await base.SaveChangesAsync(cancellationToken);
            _pendingEvents.Clear();
            return result;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException(
                "Processing job changed concurrently. Reload and retry.",
                ex);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(ProcessingSchema.Name);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProcessingDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    private void AddOutboxMessages()
    {
        foreach (var integrationEvent in _pendingEvents)
        {
            if (OutboxMessages.Local.Any(x => x.Id == integrationEvent.EventId))
                continue;

            var payload = JsonSerializer.Serialize(
                integrationEvent,
                integrationEvent.GetType(),
                JsonOptions);

            OutboxMessages.Add(
                new OutboxMessage(
                    integrationEvent.EventId,
                    integrationEvent.EventName,
                    payload,
                    integrationEvent.OccurredAt));
        }
    }
}
