using Microsoft.EntityFrameworkCore;

namespace Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

public sealed class AuditDbContext : DbContext
{
    public AuditDbContext(DbContextOptions<AuditDbContext> options)
        : base(options)
    {
    }

    // Public read surface is intentionally narrow. Writes stay inside the
    // Audit infrastructure consumer so other modules cannot append arbitrary rows.
    public DbSet<AuditEntry> Entries => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("audit");

        modelBuilder.Entity<AuditEntry>(entity =>
        {
            entity.ToTable("entries", "audit");
            entity.HasKey(x => x.Sequence);

            entity.Property(x => x.Sequence)
                .HasColumnName("sequence")
                .ValueGeneratedNever();

            entity.Property(x => x.MessageId)
                .HasColumnName("message_id");

            entity.Property(x => x.EventName)
                .HasColumnName("event_name")
                .HasMaxLength(200);

            // jsonb anahtarları yeniden sıralar ve boşlukları normalize eder;
            // geri okunan metin yayınlanan baytlardan farklı olur ve girdi
            // hash'i doğrulanamaz. Denetim günlüğü baytı olduğu gibi saklar.
            entity.Property(x => x.Payload)
                .HasColumnName("payload")
                .HasColumnType("text");

            entity.Property(x => x.DocumentId)
                .HasColumnName("document_id");

            entity.Property(x => x.OccurredAt)
                .HasColumnName("occurred_at");

            entity.Property(x => x.ReceivedAt)
                .HasColumnName("received_at");

            entity.Property(x => x.PreviousHash)
                .HasColumnName("previous_hash")
                .HasMaxLength(64);

            entity.Property(x => x.EntryHash)
                .HasColumnName("entry_hash")
                .HasMaxLength(64);

            entity.HasIndex(x => x.MessageId)
                .IsUnique();

            entity.HasIndex(x => new { x.DocumentId, x.OccurredAt });
            entity.HasIndex(x => new { x.EventName, x.OccurredAt });
        });

        base.OnModelCreating(modelBuilder);
    }
}
