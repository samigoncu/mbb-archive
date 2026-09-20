using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Cases;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence.Configurations;

internal sealed class DispositionConfiguration : IEntityTypeConfiguration<DispositionProcess>
{
    public void Configure(EntityTypeBuilder<DispositionProcess> b)
    {
        b.ToTable("disposition_processes", "retention");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Action).HasConversion<string>().HasMaxLength(40);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
        b.Property(x => x.Reason).HasMaxLength(2000);
        b.Property(x => x.CommissionReference).HasMaxLength(300);
        b.Property(x => x.CreatedBy).HasMaxLength(300);
        b.Property(x => x.ApprovedBy).HasMaxLength(300);
        b.Property(x => x.ApprovalReference).HasMaxLength(300);
        b.Property(x => x.CompletedBy).HasMaxLength(300);
        b.Property(x => x.ReceivingArchive).HasMaxLength(300);
        b.Property(x => x.ReceiptReference).HasMaxLength(300);
        b.Property(x => x.CommissionConfiguredBy).HasMaxLength(300);
        b.Property(x => x.TransferManifestJson).HasColumnType("text");
        b.Property(x => x.TransferManifestSha256).HasMaxLength(64);
        b.Property(x => x.TransferPackageSha256).HasMaxLength(64);
        b.Property(x => x.PackageCreatedBy).HasMaxLength(300);
        b.Property(x => x.PackageVerifiedBy).HasMaxLength(300);
        b.Property(x => x.ExecutionEvidenceSha256).HasMaxLength(64);
        b.Property(x => x.ExecutionMethod).HasMaxLength(300);
        b.Property(x => x.ExecutionLocation).HasMaxLength(300);
        b.Property(x => x.ExecutionWitnesses).HasMaxLength(2000);
        b.Property(x => x.ConcurrencyVersion).IsConcurrencyToken();
        b.Ignore(x => x.DomainEvents);
        b.HasOne<RetentionCase>().WithMany().HasForeignKey(x => x.RetentionCaseId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Reviews).WithOne().HasForeignKey(x => x.ProcessId).OnDelete(DeleteBehavior.Restrict);
        b.Navigation(x => x.Reviews).UsePropertyAccessMode(PropertyAccessMode.Field);
        b.HasMany(x => x.Members).WithOne().HasForeignKey(x => x.ProcessId).OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Members).UsePropertyAccessMode(PropertyAccessMode.Field);
        b.HasIndex(x => x.RetentionCaseId).IsUnique().HasFilter("\"Status\" NOT IN ('Rejected', 'Completed')");
        b.HasIndex(x => new { x.Status, x.CreatedAt });
    }
}

internal sealed class CommissionMemberConfiguration : IEntityTypeConfiguration<CommissionMember>
{
    public void Configure(EntityTypeBuilder<CommissionMember> b)
    {
        b.ToTable("commission_members", "retention"); b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Subject).HasMaxLength(300);
        b.Property(x => x.DelegateSubject).HasMaxLength(300);
        b.Property(x => x.DelegationReference).HasMaxLength(300);
        b.HasIndex(x => new { x.ProcessId, x.Subject }).IsUnique();
    }
}

internal sealed class DispositionReviewConfiguration : IEntityTypeConfiguration<DispositionReview>
{
    public void Configure(EntityTypeBuilder<DispositionReview> b)
    {
        b.ToTable("disposition_reviews", "retention"); b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Actor).HasMaxLength(300);
        b.Property(x => x.Reason).HasMaxLength(2000);
        b.HasIndex(x => new { x.ProcessId, x.Actor }).IsUnique();
    }
}
