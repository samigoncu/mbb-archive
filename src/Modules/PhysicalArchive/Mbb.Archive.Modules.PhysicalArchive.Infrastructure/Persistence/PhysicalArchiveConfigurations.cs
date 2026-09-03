using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

internal sealed class LocationConfiguration : IEntityTypeConfiguration<ArchiveLocation>
{
    public void Configure(EntityTypeBuilder<ArchiveLocation> builder)
    {
        builder.ToTable("locations", "physical_archive");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.ParentId).HasColumnName("parent_id");
        builder.Property(x => x.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(50);
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(100);
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(300);
        builder.Property(x => x.Barcode).HasColumnName("barcode").HasMaxLength(200);
        builder.Property(x => x.Capacity).HasColumnName("capacity");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Barcode).IsUnique();
        builder.Ignore(x => x.DomainEvents);
    }
}

internal sealed class FolderConfiguration : IEntityTypeConfiguration<PhysicalFolder>
{
    public void Configure(EntityTypeBuilder<PhysicalFolder> builder)
    {
        builder.ToTable("folders", "physical_archive");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.Barcode).HasColumnName("barcode").HasMaxLength(200);
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(500);
        builder.Property(x => x.FilePlanCode).HasColumnName("file_plan_code").HasMaxLength(100);
        builder.Property(x => x.LocationId).HasColumnName("location_id");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.LastMovedAt).HasColumnName("last_moved_at");
        builder.HasIndex(x => x.Barcode).IsUnique();
        builder.HasIndex(x => x.LocationId);

        builder.HasMany(x => x.Documents)
            .WithOne()
            .HasForeignKey(x => x.FolderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Metadata.FindNavigation(nameof(PhysicalFolder.Documents))
            ?.SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(x => x.DomainEvents);
    }
}

internal sealed class FolderDocumentConfiguration : IEntityTypeConfiguration<PhysicalFolderDocument>
{
    public void Configure(EntityTypeBuilder<PhysicalFolderDocument> builder)
    {
        builder.ToTable("folder_documents", "physical_archive");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.FolderId).HasColumnName("folder_id");
        builder.Property(x => x.DocumentId).HasColumnName("document_id");
        builder.Property(x => x.LinkedAt).HasColumnName("linked_at");
        builder.HasIndex(x => new { x.FolderId, x.DocumentId }).IsUnique();
        builder.HasIndex(x => x.DocumentId);
    }
}

internal sealed class LoanConfiguration : IEntityTypeConfiguration<PhysicalLoan>
{
    public void Configure(EntityTypeBuilder<PhysicalLoan> builder)
    {
        builder.ToTable("loans", "physical_archive");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.FolderId).HasColumnName("folder_id");
        builder.Property(x => x.BorrowerSubjectId).HasColumnName("borrower_subject_id").HasMaxLength(300);
        builder.Property(x => x.Purpose).HasColumnName("purpose").HasMaxLength(1000);
        builder.Property(x => x.CheckedOutAt).HasColumnName("checked_out_at");
        builder.Property(x => x.DueAt).HasColumnName("due_at");
        builder.Property(x => x.ReturnedAt).HasColumnName("returned_at");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
        builder.HasIndex(x => new { x.FolderId, x.Status });
        builder.HasIndex(x => x.DueAt);
        builder.Ignore(x => x.DomainEvents);
    }
}

internal sealed class OutboxConfiguration : IEntityTypeConfiguration<PhysicalArchiveOutboxMessage>
{
    public void Configure(EntityTypeBuilder<PhysicalArchiveOutboxMessage> builder)
    {
        builder.ToTable("outbox_messages", "physical_archive");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.OccurredAt).HasColumnName("occurred_at");
    }
}
