using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Inbox;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Configurations;

internal sealed class InboxMessageConfiguration
    : IEntityTypeConfiguration<InboxMessage>
{
    public void Configure(EntityTypeBuilder<InboxMessage> builder)
    {
        builder.ToTable("inbox_messages", ProcessingSchema.Name);
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.EventName)
            .HasColumnName("event_name")
            .HasMaxLength(200);

        builder.Property(x => x.ProcessedAt)
            .HasColumnName("processed_at");
    }
}
