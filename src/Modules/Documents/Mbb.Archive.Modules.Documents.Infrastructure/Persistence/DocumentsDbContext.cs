using Mbb.Archive.Modules.Documents.Application;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Inbox;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

public sealed class DocumentsDbContext : DbContext, IUnitOfWork<DocumentsBoundary>, IOutbox<DocumentsBoundary>, IInbox<DocumentsBoundary>
{
    private static readonly JsonSerializerOptions OutboxJsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingIntegrationEvents = [];

    public DocumentsDbContext(DbContextOptions<DocumentsDbContext> options)
        : base(options)
    {
    }

    internal DbSet<Document> Documents => Set<Document>();
    internal DbSet<DocumentFileIngestion> FileIngestions => Set<DocumentFileIngestion>();
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
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);
        _pendingIntegrationEvents.Add(integrationEvent);
    }

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        AddPendingOutboxMessages();

        try
        {
            var changes = await base.SaveChangesAsync(cancellationToken);

            ClearDomainEvents();
            _pendingIntegrationEvents.Clear();

            return changes;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException(
                "The document changed while the request was being processed. Reload and retry.",
                ex);
        }
        catch
        {
            // Başarısız transaction sonrasında pending event listesi korunur.
            // Aynı DbContext ile kontrollü retry yapılırsa event kaybı oluşmaz.
            throw;
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(DocumentsSchema.Name);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DocumentsDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }

    private void AddPendingOutboxMessages()
    {
        if (_pendingIntegrationEvents.Count == 0)
            return;

        var alreadyTrackedIds = ChangeTracker
            .Entries<OutboxMessage>()
            .Select(entry => entry.Entity.Id)
            .ToHashSet();

        foreach (var integrationEvent in _pendingIntegrationEvents)
        {
            if (alreadyTrackedIds.Contains(integrationEvent.EventId))
                continue;

            var payload = JsonSerializer.Serialize(
                integrationEvent,
                integrationEvent.GetType(),
                OutboxJsonOptions);

            OutboxMessages.Add(
                new OutboxMessage(
                    integrationEvent.EventId,
                    integrationEvent.EventName,
                    payload,
                    integrationEvent.OccurredAt));
        }
    }

    private void ClearDomainEvents()
    {
        foreach (var aggregate in ChangeTracker
                     .Entries()
                     .Select(entry => entry.Entity)
                     .OfType<AggregateRoot<DocumentId>>())
        {
            aggregate.ClearDomainEvents();
        }

        foreach (var aggregate in ChangeTracker
                     .Entries()
                     .Select(entry => entry.Entity)
                     .OfType<AggregateRoot<DocumentFileIngestionId>>())
        {
            aggregate.ClearDomainEvents();
        }
    }
}
