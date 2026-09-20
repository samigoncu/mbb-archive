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

        builder.Property(x => x.OwnerUnitId)
            .HasColumnName("owner_unit_id");

        // Kapsam süzgeci bu sütunda önek eşleşmesi yapar.
        builder.Property(x => x.OwnerUnitPath)
            .HasColumnName("owner_unit_path")
            .HasMaxLength(1000);

        builder.Property(x => x.FilePlanCode)
            .HasColumnName("file_plan_code")
            .HasMaxLength(100);

        builder.Property(x => x.ConcurrencyVersion)
            .HasColumnName("concurrency_version")
            .IsConcurrencyToken();

        builder.Property(x => x.DossierId).HasColumnName("dossier_id");
        builder.Property(x => x.CurrentVersionNumber).HasColumnName("current_version_number");
        builder.HasOne<Mbb.Archive.Modules.Documents.Domain.Dossiers.DigitalDossier>()
            .WithMany().HasForeignKey(x => x.DossierId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(x => x.StatusBeforeCancellation).HasColumnName("status_before_cancellation").HasConversion<string>().HasMaxLength(40);
        builder.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
        builder.Property(x => x.CancelledBy).HasColumnName("cancelled_by").HasMaxLength(200);
        builder.Property(x => x.CancellationReason).HasColumnName("cancellation_reason").HasMaxLength(1000);
        builder.Property(x => x.CancellationOperationId).HasColumnName("cancellation_operation_id");
        builder.Property(x => x.CancellationOperationActor).HasColumnName("cancellation_operation_actor").HasMaxLength(200);
        builder.Property(x => x.CancellationOperationReason).HasColumnName("cancellation_operation_reason").HasMaxLength(1000);
        builder.Ignore(x => x.DomainEvents);

        builder.HasIndex(x => x.CreatedAt)
            .HasDatabaseName("ix_documents_created_at");

        builder.HasIndex(x => x.OwnerUnitPath)
            .HasDatabaseName("ix_documents_owner_unit_path");

        builder.HasIndex(x => x.FilePlanCode)
            .HasDatabaseName("ix_documents_file_plan_code");

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
