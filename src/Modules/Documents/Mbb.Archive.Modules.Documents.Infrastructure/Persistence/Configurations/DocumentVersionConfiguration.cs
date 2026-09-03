using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Configurations;

internal sealed class DocumentVersionConfiguration : IEntityTypeConfiguration<DocumentVersion>
{
    public void Configure(EntityTypeBuilder<DocumentVersion> builder)
    {
        builder.ToTable("document_versions", DocumentsSchema.Name);

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.DocumentId)
            .HasColumnName("document_id")
            .HasConversion(id => id.Value, value => new DocumentId(value));

        builder.Property(x => x.VersionNumber)
            .HasColumnName("version_number");

        builder.Property(x => x.StorageKey)
            .HasColumnName("storage_key")
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(x => x.Sha256Hash)
            .HasColumnName("sha256_hash")
            .HasMaxLength(64)
            .IsFixedLength()
            .IsRequired();

        builder.Property(x => x.MimeType)
            .HasColumnName("mime_type")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.SizeBytes)
            .HasColumnName("size_bytes");

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at");

        builder.HasIndex(x => new { x.DocumentId, x.VersionNumber })
            .IsUnique()
            .HasDatabaseName("ux_document_versions_document_version");

        builder.HasIndex(x => x.Sha256Hash)
            .HasDatabaseName("ix_document_versions_sha256");
    }
}
