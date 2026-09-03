using Mbb.Archive.Modules.Search.Application;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Inbox;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Indexing;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence;

public sealed class SearchDbContext : DbContext, IUnitOfWork<SearchBoundary>, IInbox<SearchBoundary>, IOutbox<SearchBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public SearchDbContext(DbContextOptions<SearchDbContext> options) : base(options) { }

    internal DbSet<SearchDocument> Documents => Set<SearchDocument>();
    internal DbSet<InboxMessage> InboxMessages => Set<InboxMessage>();
    internal DbSet<SearchIndexRequest> IndexRequests => Set<SearchIndexRequest>();
    internal DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public Task<bool> HasProcessedAsync(Guid messageId,CancellationToken cancellationToken)
        => InboxMessages.AsNoTracking().AnyAsync(x=>x.Id==messageId,cancellationToken);

    public void MarkProcessed(Guid messageId,string eventName,DateTimeOffset processedAt)
        => InboxMessages.Add(new InboxMessage(messageId,eventName,processedAt));

    public void Enqueue(IIntegrationEvent integrationEvent)=>_pendingEvents.Add(integrationEvent);

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken=default)
    {
        foreach(var integrationEvent in _pendingEvents)
        {
            if(OutboxMessages.Local.Any(x=>x.Id==integrationEvent.EventId))continue;
            OutboxMessages.Add(new OutboxMessage(
                integrationEvent.EventId,
                integrationEvent.EventName,
                JsonSerializer.Serialize(integrationEvent,integrationEvent.GetType(),JsonOptions),
                integrationEvent.OccurredAt));
        }
        var result=await base.SaveChangesAsync(cancellationToken);
        _pendingEvents.Clear();
        return result;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SearchSchema.Name);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SearchDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
