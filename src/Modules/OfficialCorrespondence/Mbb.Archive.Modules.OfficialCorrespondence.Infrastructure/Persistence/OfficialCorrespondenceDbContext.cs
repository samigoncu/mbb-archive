using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Persistence;

public sealed class OfficialCorrespondenceDbContext :
    DbContext,
    IUnitOfWork<OfficialCorrespondenceBoundary>,
    IOutbox<OfficialCorrespondenceBoundary>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly List<IIntegrationEvent> _pendingEvents = [];

    public OfficialCorrespondenceDbContext(
        DbContextOptions<OfficialCorrespondenceDbContext> options)
        : base(options)
    {
    }

    internal DbSet<EypPackageInspection> EypInspections => Set<EypPackageInspection>();
    internal DbSet<OfficialCorrespondenceOutboxMessage> OutboxMessages
        => Set<OfficialCorrespondenceOutboxMessage>();

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
                new OfficialCorrespondenceOutboxMessage(
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
        modelBuilder.HasDefaultSchema("official_correspondence");

        modelBuilder.Entity<EypPackageInspection>(entity =>
        {
            entity.ToTable("eyp_inspections", "official_correspondence");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.DocumentVersionId).HasColumnName("document_version_id");
            entity.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(500);
            entity.Property(x => x.PackageSha256).HasColumnName("package_sha256").HasMaxLength(64).IsFixedLength();
            entity.Property(x => x.PartCount).HasColumnName("part_count");
            entity.Property(x => x.RelationshipCount).HasColumnName("relationship_count");
            entity.Property(x => x.StructuralStatus).HasColumnName("structural_status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.OfficialValidationStatus).HasColumnName("official_validation_status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.StructuralReportJson).HasColumnName("structural_report_json").HasColumnType("jsonb");
            entity.Property(x => x.OfficialReportJson).HasColumnName("official_report_json").HasColumnType("jsonb");
            entity.Property(x => x.InspectedAt).HasColumnName("inspected_at");
            entity.HasIndex(x => x.PackageSha256);
            entity.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<OfficialCorrespondenceOutboxMessage>(entity =>
        {
            entity.ToTable("outbox_messages", "official_correspondence");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
            entity.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            entity.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        });

        base.OnModelCreating(modelBuilder);
    }
}
