using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Configurations;

internal sealed class DocumentFileIngestionConfiguration
    : IEntityTypeConfiguration<DocumentFileIngestion>
{
    public void Configure(EntityTypeBuilder<DocumentFileIngestion> builder)
    {
        builder.ToTable("file_ingestions", DocumentsSchema.Name);

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasConversion(id => id.Value, value => new DocumentFileIngestionId(value))
            .ValueGeneratedNever();

        builder.Property(x => x.DocumentId)
            .HasColumnName("document_id")
            .HasConversion(id => id.Value, value => new DocumentId(value));

        builder.Property(x => x.OriginalFileName)
            .HasColumnName("original_file_name")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(x => x.SubmittedBy)
            .HasColumnName("submitted_by")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.VersionReason)
            .HasColumnName("version_reason")
            .HasMaxLength(1000);

        builder.Property(x => x.ClientContentType)
            .HasColumnName("client_content_type")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(x => x.DeclaredSizeBytes)
            .HasColumnName("declared_size_bytes");

        builder.Property(x => x.StagingStorageKey)
            .HasColumnName("staging_storage_key")
            .HasMaxLength(1000);

        builder.Property(x => x.Sha256Hash)
            .HasColumnName("sha256_hash")
            .HasMaxLength(64)
            .IsFixedLength();

        builder.Property(x => x.StoredSizeBytes)
            .HasColumnName("stored_size_bytes");

        builder.Property(x => x.DetectedMimeType)
            .HasColumnName("detected_mime_type")
            .HasMaxLength(255);

        builder.Property(x => x.SecurityScanner)
            .HasColumnName("security_scanner")
            .HasMaxLength(255);

        builder.Property(x => x.SecurityScannedAt)
            .HasColumnName("security_scanned_at");

        builder.Property(x => x.RejectionCode)
            .HasColumnName("rejection_code")
            .HasMaxLength(100);

        builder.Property(x => x.RejectionDetail)
            .HasColumnName("rejection_detail")
            .HasMaxLength(2000);

        builder.Property(x => x.OriginalStorageKey)
            .HasColumnName("original_storage_key")
            .HasMaxLength(1000);

        builder.Property(x => x.OriginalStoredAt)
            .HasColumnName("original_stored_at");

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at");

        builder.Property(x => x.StagedAt)
            .HasColumnName("staged_at");

        builder.Property(x => x.ConcurrencyVersion)
            .HasColumnName("concurrency_version")
            .IsConcurrencyToken();

        builder.Ignore(x => x.DomainEvents);

        builder.HasIndex(x => x.DocumentId)
            .HasDatabaseName("ix_file_ingestions_document_id");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("ix_file_ingestions_status");

        builder.HasIndex(x => x.Sha256Hash)
            .HasDatabaseName("ix_file_ingestions_sha256");
    }
}
