using Mbb.Archive.Modules.Classification.Application;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
using Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;

public sealed class ClassificationDbContext : DbContext, IUnitOfWork<ClassificationBoundary>, IOutbox<ClassificationBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public ClassificationDbContext(
        DbContextOptions<ClassificationDbContext> options)
        : base(options)
    {
    }

    internal DbSet<FilePlan> FilePlans => Set<FilePlan>();
    internal DbSet<MetadataSchema> MetadataSchemas => Set<MetadataSchema>();
    internal DbSet<DocumentClassification> DocumentClassifications => Set<DocumentClassification>();
    internal DbSet<DocumentMetadataSet> DocumentMetadataSets => Set<DocumentMetadataSet>();
    internal DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public void Enqueue(IIntegrationEvent integrationEvent)
        => _pendingEvents.Add(integrationEvent);

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        foreach (var integrationEvent in _pendingEvents)
        {
            if (OutboxMessages.Local.Any(x => x.Id == integrationEvent.EventId))
                continue;

            OutboxMessages.Add(
                new OutboxMessage(
                    integrationEvent.EventId,
                    integrationEvent.EventName,
                    JsonSerializer.Serialize(
                        integrationEvent,
                        integrationEvent.GetType(),
                        JsonOptions),
                    integrationEvent.OccurredAt));
        }

        var result = await base.SaveChangesAsync(cancellationToken);
        _pendingEvents.Clear();
        return result;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(ClassificationSchema.Name);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ClassificationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
