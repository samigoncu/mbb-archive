using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Inbox;
namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Configurations;
internal sealed class InboxMessageConfiguration:IEntityTypeConfiguration<InboxMessage>{public void Configure(EntityTypeBuilder<InboxMessage>b){b.ToTable("inbox_messages",SearchSchema.Name);b.HasKey(x=>x.Id);b.Property(x=>x.Id).HasColumnName("id").ValueGeneratedNever();b.Property(x=>x.EventName).HasColumnName("event_name").HasMaxLength(200);b.Property(x=>x.ProcessedAt).HasColumnName("processed_at");}}
