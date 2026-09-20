using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Domain.Relations;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence;

public sealed class GeoDbContext : DbContext, IUnitOfWork<GeoBoundary>, IOutbox<GeoBoundary>
{
    private readonly List<IIntegrationEvent> _events = [];

    public GeoDbContext(DbContextOptions<GeoDbContext> options) : base(options)
    {
    }

    internal DbSet<GeoEntity> Entities => Set<GeoEntity>();
    internal DbSet<DocumentGeoRelation> Relations => Set<DocumentGeoRelation>();
    internal DbSet<GeoOutboxMessage> Outbox => Set<GeoOutboxMessage>();
    internal DbSet<GeoService> Services => Set<GeoService>();
    internal DbSet<GeoServiceLayer> ServiceLayers => Set<GeoServiceLayer>();
    internal DbSet<GeoBasemap> Basemap => Set<GeoBasemap>();

    public void Enqueue(IIntegrationEvent integrationEvent)
        => _events.Add(integrationEvent);

    /// <summary>
    /// Olaylar aynı transaction içinde outbox'a yazılır; ilişki kaydedilip
    /// olay kaybolması mümkün değildir (§4 transactional outbox).
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var integrationEvent in _events)
        {
            if (Outbox.Local.Any(x => x.Id == integrationEvent.EventId))
                continue;

            Outbox.Add(
                new GeoOutboxMessage(
                    integrationEvent.EventId,
                    integrationEvent.EventName,
                    JsonSerializer.Serialize(
                        integrationEvent,
                        integrationEvent.GetType(),
                        new JsonSerializerOptions(JsonSerializerDefaults.Web)),
                    integrationEvent.OccurredAt));
        }

        try
        {
            var written = await base.SaveChangesAsync(cancellationToken);
            _events.Clear();
            return written;
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new ConcurrencyConflictException("Coğrafi kayıt başka bir işlemle değişti; yeniden yükleyin.", exception);
        }
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("geo");

        builder.Entity<GeoEntity>(entity =>
        {
            entity.ToTable("entities");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .HasColumnName("id")
                .HasConversion(id => id.Value, value => new GeoEntityId(value))
                .ValueGeneratedNever();

            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(100).IsRequired();
            entity.Property(x => x.LayerName).HasColumnName("layer_name").HasMaxLength(200).IsRequired();
            entity.Property(x => x.FeatureId).HasColumnName("feature_id").HasMaxLength(200).IsRequired();
            entity.Property(x => x.EntityType).HasColumnName("entity_type").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(300).IsRequired();

            // GeoJSON metin olarak saklanır; jsonb normalizasyonu geometriyi
            // yeniden sıralayabilir ve sağlayıcıdan gelen hâli değiştirir.
            entity.Property(x => x.GeoJson).HasColumnName("geojson").HasColumnType("text").IsRequired();
            entity.Property(x => x.PropertiesJson).HasColumnName("properties").HasColumnType("text");

            entity.Property(x => x.ExternalReference).HasColumnName("external_reference").HasMaxLength(500);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.ConcurrencyVersion).HasColumnName("concurrency_version").IsConcurrencyToken();

            // GeoBoundingBox bir değer nesnesidir (struct); EF'te sahipli varlık değil
            // karmaşık tip olarak eşlenir, böylece kolonlar aynı tabloda kalır.
            entity.ComplexProperty(x => x.BoundingBox, box =>
            {
                box.Property(b => b.MinLongitude).HasColumnName("min_longitude");
                box.Property(b => b.MinLatitude).HasColumnName("min_latitude");
                box.Property(b => b.MaxLongitude).HasColumnName("max_longitude");
                box.Property(b => b.MaxLatitude).HasColumnName("max_latitude");
            });

            // Aynı feature iki kez içe aktarılamaz.
            entity.HasIndex(x => new { x.Provider, x.LayerName, x.FeatureId })
                .IsUnique()
                .HasDatabaseName("ux_geo_entities_provider_layer_feature");

            entity.HasIndex(x => x.Name).HasDatabaseName("ix_geo_entities_name");
            entity.HasIndex(x => x.EntityType).HasDatabaseName("ix_geo_entities_type");
        });

        builder.Entity<DocumentGeoRelation>(relation =>
        {
            relation.ToTable("document_relations");
            relation.HasKey(x => x.Id);

            relation.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            relation.Property(x => x.DocumentId).HasColumnName("document_id");

            relation.Property(x => x.GeoEntityId)
                .HasColumnName("geo_entity_id")
                .HasConversion(id => id.Value, value => new GeoEntityId(value));

            relation.Property(x => x.RelationType)
                .HasColumnName("relation_type")
                .HasConversion<string>()
                .HasMaxLength(40);

            relation.Property(x => x.ValidFrom).HasColumnName("valid_from");
            relation.Property(x => x.ValidTo).HasColumnName("valid_to");
            relation.Property(x => x.CreatedBy).HasColumnName("created_by").HasMaxLength(200).IsRequired();
            relation.Property(x => x.CreatedAt).HasColumnName("created_at");

            relation.HasIndex(x => x.DocumentId).HasDatabaseName("ix_geo_relations_document");
            relation.HasIndex(x => x.GeoEntityId).HasDatabaseName("ix_geo_relations_entity");

            relation.HasOne<GeoEntity>()
                .WithMany()
                .HasForeignKey(x => x.GeoEntityId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<GeoOutboxMessage>(message =>
        {
            message.ToTable("outbox_messages");
            message.HasKey(x => x.Id);

            message.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            message.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
            message.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            message.Property(x => x.OccurredAt).HasColumnName("occurred_at");
            message.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at");
            message.Property(x => x.ProcessedAt).HasColumnName("processed_at");
            message.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            message.Property(x => x.LockedBy).HasColumnName("locked_by").HasMaxLength(200);
            message.Property(x => x.LockedUntil).HasColumnName("locked_until");
            message.Property(x => x.DeadLetteredAt).HasColumnName("dead_lettered_at");
            message.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(4000);
        });


        builder.Entity<GeoService>(entity =>
        {
            entity.ToTable("services");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(300).IsRequired();
            entity.Property(x => x.BaseUrl).HasColumnName("base_url").HasMaxLength(1000).IsRequired();
            entity.Property(x => x.UserName).HasColumnName("user_name").HasMaxLength(300);
            // Şifreli metin; anahtar Data Protection tarafından yönetilir.
            entity.Property(x => x.PasswordCipher).HasColumnName("password_cipher").HasMaxLength(4000);
            entity.Property(x => x.TimeoutSeconds).HasColumnName("timeout_seconds");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.SortOrder).HasColumnName("sort_order");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.Property(x => x.UpdatedBy).HasColumnName("updated_by").HasMaxLength(300);
            entity.Ignore(x => x.DomainEvents);
            entity.HasMany(x => x.Layers).WithOne().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
            entity.Navigation(x => x.Layers).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        builder.Entity<GeoServiceLayer>(entity =>
        {
            entity.ToTable("service_layers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.ServiceId).HasColumnName("service_id");
            entity.Property(x => x.LayerName).HasColumnName("layer_name").HasMaxLength(300).IsRequired();
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(300).IsRequired();
            entity.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(60);
            entity.Property(x => x.NameAttribute).HasColumnName("name_attribute").HasMaxLength(200);
            entity.Property(x => x.VisibleByDefault).HasColumnName("visible_by_default");
            entity.Property(x => x.OpacityPercent).HasColumnName("opacity_percent");
            entity.Property(x => x.ImageFormat).HasColumnName("image_format").HasMaxLength(100);
            entity.Property(x => x.IsQueryable).HasColumnName("is_queryable");
            entity.Property(x => x.SortOrder).HasColumnName("sort_order");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.HasIndex(x => new { x.ServiceId, x.LayerName }).IsUnique();
        });

        builder.Entity<GeoBasemap>(entity =>
        {
            entity.ToTable("basemap");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.TileUrl).HasColumnName("tile_url").HasMaxLength(1000);
            entity.Property(x => x.Attribution).HasColumnName("attribution").HasMaxLength(1000);
            entity.Property(x => x.CenterLatitude).HasColumnName("center_latitude");
            entity.Property(x => x.CenterLongitude).HasColumnName("center_longitude");
            entity.Property(x => x.Zoom).HasColumnName("zoom");
            entity.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken();
            entity.Property(x => x.UpdatedBy).HasColumnName("updated_by").HasMaxLength(300);
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.HasData(new GeoBasemap());
        });

        base.OnModelCreating(builder);
    }
}

/// <summary>Geo modülünün kendi outbox satırı; kiralama ve geri çekilme taşır.</summary>
internal sealed class GeoOutboxMessage
{
    private GeoOutboxMessage()
    {
    }

    internal GeoOutboxMessage(Guid id, string eventName, string payload, DateTimeOffset occurredAt)
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
    public string? LockedBy { get; private set; }
    public DateTimeOffset? LockedUntil { get; private set; }
    public DateTimeOffset? DeadLetteredAt { get; private set; }
    public string? LastError { get; private set; }

    internal void Lease(string worker, DateTimeOffset until)
    {
        LockedBy = worker;
        LockedUntil = until;
    }

    internal void Published(string worker, DateTimeOffset now)
    {
        EnsureLease(worker);
        ProcessedAt = now;
        LockedBy = null;
        LockedUntil = null;
    }

    internal void Failed(
        string worker,
        string error,
        DateTimeOffset now,
        DateTimeOffset nextAttempt,
        int maxAttempts)
    {
        EnsureLease(worker);
        AttemptCount++;
        LastError = error.Length <= 4000 ? error : error[..4000];
        LockedBy = null;
        LockedUntil = null;

        if (AttemptCount >= maxAttempts)
            DeadLetteredAt = now;
        else
            NextAttemptAt = nextAttempt;
    }

    private void EnsureLease(string worker)
    {
        if (LockedBy != worker)
            throw new InvalidOperationException("Geo outbox lease mismatch.");
    }
}
