using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Inbox;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Configurations;

internal sealed class InboxMessageConfiguration : IEntityTypeConfiguration<InboxMessage>
{
    public void Configure(EntityTypeBuilder<InboxMessage> builder)
    {
        builder.ToTable("inbox_messages", DocumentsSchema.Name);

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.EventName)
            .HasColumnName("event_name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.ProcessedAt)
            .HasColumnName("processed_at");

        builder.HasIndex(x => x.ProcessedAt)
            .HasDatabaseName("ix_inbox_processed_at");
    }
}
