using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Application;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

public sealed class PhysicalArchiveDbContext :
    DbContext,
    IUnitOfWork<PhysicalArchiveBoundary>,
    IOutbox<PhysicalArchiveBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public PhysicalArchiveDbContext(
        DbContextOptions<PhysicalArchiveDbContext> options) : base(options)
    {
    }

    internal DbSet<ArchiveLocation> Locations => Set<ArchiveLocation>();
    internal DbSet<PhysicalFolder> Folders => Set<PhysicalFolder>();
    internal DbSet<PhysicalLoan> Loans => Set<PhysicalLoan>();
    internal DbSet<PhysicalArchiveOutboxMessage> OutboxMessages => Set<PhysicalArchiveOutboxMessage>();

    public void Enqueue(IIntegrationEvent integrationEvent)
        => _pendingEvents.Add(integrationEvent);

    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        foreach (var integrationEvent in _pendingEvents)
        {
            OutboxMessages.Add(
                new PhysicalArchiveOutboxMessage(
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
        modelBuilder.HasDefaultSchema("physical_archive");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PhysicalArchiveDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
