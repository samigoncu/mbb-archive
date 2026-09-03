using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Processing.Domain.Artifacts;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Configurations;
internal sealed class ProcessingArtifactConfiguration : IEntityTypeConfiguration<ProcessingArtifact>
{
    public void Configure(EntityTypeBuilder<ProcessingArtifact> builder)
    {
        builder.ToTable("artifacts",ProcessingSchema.Name); builder.HasKey(x=>x.Id); builder.Property(x=>x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x=>x.ProcessingJobId).HasColumnName("processing_job_id").HasConversion(id=>id.Value,value=>new ProcessingJobId(value));
        builder.Property(x=>x.Type).HasColumnName("artifact_type").HasConversion<string>().HasMaxLength(80);
        builder.Property(x=>x.StorageKey).HasColumnName("storage_key").HasMaxLength(1000).IsRequired(); builder.Property(x=>x.MimeType).HasColumnName("mime_type").HasMaxLength(255);
        builder.Property(x=>x.Sha256Hash).HasColumnName("sha256_hash").HasMaxLength(64).IsFixedLength(); builder.Property(x=>x.SizeBytes).HasColumnName("size_bytes"); builder.Property(x=>x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x=>new{x.ProcessingJobId,x.Type}).HasDatabaseName("ix_processing_artifact_job_type");
    }
}
