using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Configurations;
internal sealed class DigitalDossierConfiguration : IEntityTypeConfiguration<DigitalDossier>
{
    public void Configure(EntityTypeBuilder<DigitalDossier> b)
    {
        b.ToTable("digital_dossiers", "documents"); b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        b.Property(x => x.OwnerUnitId).HasColumnName("owner_unit_id");
        b.Property(x => x.FilePlanId).HasColumnName("file_plan_id");
        b.Property(x => x.FilePlanItemId).HasColumnName("file_plan_item_id");
        b.Property(x => x.FilePlanVersion).HasColumnName("file_plan_version").HasMaxLength(100);
        b.Property(x => x.FilePlanCode).HasColumnName("file_plan_code").HasMaxLength(100);
        b.Property(x => x.FilePlanTitle).HasColumnName("file_plan_title").HasMaxLength(500);
        b.Property(x => x.Title).HasColumnName("title").HasMaxLength(300);
        b.Property(x => x.Year).HasColumnName("year");
        b.Property(x => x.CreatedAt).HasColumnName("created_at");
        b.HasIndex(x => new { x.OwnerUnitId, x.FilePlanId, x.FilePlanCode, x.Year });
        b.Ignore(x => x.DomainEvents);
    }
}
