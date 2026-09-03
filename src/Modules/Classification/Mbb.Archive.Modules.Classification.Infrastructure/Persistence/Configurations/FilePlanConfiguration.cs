using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Configurations;
internal sealed class FilePlanConfiguration : IEntityTypeConfiguration<FilePlan>
{
    public void Configure(EntityTypeBuilder<FilePlan> b)
    {
        b.ToTable("file_plans",ClassificationSchema.Name);b.HasKey(x=>x.Id);b.Property(x=>x.Id).HasColumnName("id").HasConversion(id=>id.Value,v=>new FilePlanId(v)).ValueGeneratedNever();
        b.Property(x=>x.Code).HasColumnName("code").HasMaxLength(80);b.Property(x=>x.Name).HasColumnName("name").HasMaxLength(300);b.Property(x=>x.Version).HasColumnName("version").HasMaxLength(80);b.Property(x=>x.Authority).HasColumnName("authority").HasMaxLength(300);b.Property(x=>x.EffectiveFrom).HasColumnName("effective_from");b.Property(x=>x.EffectiveTo).HasColumnName("effective_to");b.Property(x=>x.IsActive).HasColumnName("is_active");b.Ignore(x=>x.DomainEvents);
        b.HasMany(x=>x.Items).WithOne().HasForeignKey(x=>x.FilePlanId).OnDelete(DeleteBehavior.Cascade);b.Metadata.FindNavigation(nameof(FilePlan.Items))?.SetPropertyAccessMode(PropertyAccessMode.Field);b.HasIndex(x=>new{x.Code,x.Version}).IsUnique().HasDatabaseName("ux_file_plan_code_version");
    }
}
