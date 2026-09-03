using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Configurations;
internal sealed class ProcessingJobConfiguration : IEntityTypeConfiguration<ProcessingJob>
{
    public void Configure(EntityTypeBuilder<ProcessingJob> builder)
    {
        builder.ToTable("jobs",ProcessingSchema.Name); builder.HasKey(x=>x.Id);
        builder.Property(x=>x.Id).HasColumnName("id").HasConversion(id=>id.Value,value=>new ProcessingJobId(value)).ValueGeneratedNever();
        builder.Property(x=>x.DocumentId).HasColumnName("document_id"); builder.Property(x=>x.DocumentVersionId).HasColumnName("document_version_id");
        builder.Property(x=>x.OriginalStorageKey).HasColumnName("original_storage_key").HasMaxLength(1000).IsRequired(); builder.Property(x=>x.Sha256Hash).HasColumnName("sha256_hash").HasMaxLength(64).IsFixedLength();
        builder.Property(x=>x.MimeType).HasColumnName("mime_type").HasMaxLength(255); builder.Property(x=>x.Stage).HasColumnName("stage").HasConversion<string>().HasMaxLength(80);
        builder.Property(x=>x.CreatedAt).HasColumnName("created_at"); builder.Property(x=>x.StartedAt).HasColumnName("started_at"); builder.Property(x=>x.CompletedAt).HasColumnName("completed_at");
        builder.Property(x=>x.FailureCode).HasColumnName("failure_code").HasMaxLength(100); builder.Property(x=>x.FailureDetail).HasColumnName("failure_detail").HasMaxLength(4000);
        builder.Property(x=>x.PdfPageCount).HasColumnName("pdf_page_count"); builder.Property(x=>x.PdfVersion).HasColumnName("pdf_version").HasMaxLength(40); builder.Property(x=>x.PdfHasEmbeddedText).HasColumnName("pdf_has_embedded_text");
        builder.Property(x=>x.OcrAverageConfidence).HasColumnName("ocr_average_confidence"); builder.Property(x=>x.OcrPageCount).HasColumnName("ocr_page_count"); builder.Property(x=>x.OcrEngine).HasColumnName("ocr_engine").HasMaxLength(200); builder.Property(x=>x.OcrLanguages).HasColumnName("ocr_languages").HasMaxLength(100);
        builder.Property(x=>x.ConcurrencyVersion).HasColumnName("concurrency_version").IsConcurrencyToken(); builder.Ignore(x=>x.DomainEvents);
        builder.HasMany(x=>x.Artifacts).WithOne().HasForeignKey(x=>x.ProcessingJobId).OnDelete(DeleteBehavior.Cascade);
        builder.Metadata.FindNavigation(nameof(ProcessingJob.Artifacts))?.SetPropertyAccessMode(PropertyAccessMode.Field);
        builder.HasIndex(x=>x.DocumentVersionId).IsUnique().HasDatabaseName("ux_processing_job_document_version"); builder.HasIndex(x=>x.Stage).HasDatabaseName("ix_processing_job_stage");
    }
}
