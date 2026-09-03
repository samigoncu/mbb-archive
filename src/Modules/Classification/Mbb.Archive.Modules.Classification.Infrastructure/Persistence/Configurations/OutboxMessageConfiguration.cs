using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Configurations;

internal sealed class OutboxMessageConfiguration
    : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages", ClassificationSchema.Name);
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        builder.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at");
        builder.Property(x => x.ProcessedAt).HasColumnName("processed_at");
        builder.Property(x => x.DeadLetteredAt).HasColumnName("dead_lettered_at");
        builder.Property(x => x.AttemptCount).HasColumnName("attempt_count");
        builder.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(4000);
        builder.Property(x => x.LockedBy).HasColumnName("locked_by").HasMaxLength(200);
        builder.Property(x => x.LockedUntil).HasColumnName("locked_until");

        builder.HasIndex(x => new { x.ProcessedAt, x.DeadLetteredAt, x.NextAttemptAt })
            .HasDatabaseName("ix_classification_outbox_dispatch");
    }
}
