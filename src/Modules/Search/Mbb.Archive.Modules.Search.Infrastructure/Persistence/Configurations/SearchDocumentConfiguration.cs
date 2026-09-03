using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Search.Domain.Documents;

namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Configurations;

internal sealed class SearchDocumentConfiguration : IEntityTypeConfiguration<SearchDocument>
{
    public void Configure(EntityTypeBuilder<SearchDocument> builder)
    {
        builder.ToTable("documents", SearchSchema.Name);
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("document_id").ValueGeneratedNever();
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(300);
        builder.Property(x => x.DocumentVersionId).HasColumnName("document_version_id");
        builder.Property(x => x.MimeType).HasColumnName("mime_type").HasMaxLength(255);
        builder.Property(x => x.TextArtifactStorageKey).HasColumnName("text_artifact_storage_key").HasMaxLength(1000);
        builder.Property(x => x.OcrJsonArtifactStorageKey).HasColumnName("ocr_json_artifact_storage_key").HasMaxLength(1000);
        builder.Property(x => x.ClassificationJson).HasColumnName("classification_json").HasColumnType("jsonb");
        builder.Property(x => x.MetadataJson).HasColumnName("metadata_json").HasColumnType("jsonb");
        builder.Property(x => x.Revision).HasColumnName("revision").IsConcurrencyToken();
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Ignore(x => x.DomainEvents);
        builder.HasIndex(x => x.UpdatedAt).HasDatabaseName("ix_search_documents_updated_at");
    }
}
