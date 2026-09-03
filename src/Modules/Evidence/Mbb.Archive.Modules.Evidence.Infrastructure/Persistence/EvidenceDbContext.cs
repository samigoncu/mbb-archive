using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Persistence;

public sealed class EvidenceDbContext :
    DbContext,
    IUnitOfWork<EvidenceBoundary>,
    IOutbox<EvidenceBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public EvidenceDbContext(DbContextOptions<EvidenceDbContext> options)
        : base(options)
    {
    }

    internal DbSet<EvidenceValidation> Validations => Set<EvidenceValidation>();
    internal DbSet<EvidenceOutboxMessage> OutboxMessages => Set<EvidenceOutboxMessage>();

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
                new EvidenceOutboxMessage(
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
        modelBuilder.HasDefaultSchema("evidence");

        modelBuilder.Entity<EvidenceValidation>(entity =>
        {
            entity.ToTable("validations", "evidence");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.DocumentVersionId).HasColumnName("document_version_id");
            entity.Property(x => x.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(80);
            entity.Property(x => x.ContentSha256).HasColumnName("content_sha256").HasMaxLength(64).IsFixedLength();
            entity.Property(x => x.Profile).HasColumnName("profile").HasMaxLength(300);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(300);
            entity.Property(x => x.ReportJson).HasColumnName("report_json").HasColumnType("jsonb");
            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.HasIndex(x => new { x.DocumentVersionId, x.Kind, x.CompletedAt });
            entity.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<EvidenceOutboxMessage>(entity =>
        {
            entity.ToTable("outbox_messages", "evidence");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
            entity.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            entity.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        });

        base.OnModelCreating(modelBuilder);
    }
}
