using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Configurations;

internal sealed class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> builder)
    {
        builder.ToTable("documents", DocumentsSchema.Name);

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasConversion(id => id.Value, value => new DocumentId(value))
            .ValueGeneratedNever();

        builder.Property(x => x.Title)
            .HasColumnName("title")
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(x => x.ArchivedAt)
            .HasColumnName("archived_at");

        builder.Property(x => x.ConcurrencyVersion)
            .HasColumnName("concurrency_version")
            .IsConcurrencyToken();

        builder.Ignore(x => x.DomainEvents);

        builder.HasIndex(x => x.CreatedAt)
            .HasDatabaseName("ix_documents_created_at");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("ix_documents_status");

        builder.HasMany(x => x.Versions)
            .WithOne()
            .HasForeignKey(x => x.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        var navigation = builder.Metadata.FindNavigation(nameof(Document.Versions));

        // Aggregate child collection dışarıdan mutate edilmemelidir.
        // EF Core private backing field üzerinden hydrate eder.
        navigation?.SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}
