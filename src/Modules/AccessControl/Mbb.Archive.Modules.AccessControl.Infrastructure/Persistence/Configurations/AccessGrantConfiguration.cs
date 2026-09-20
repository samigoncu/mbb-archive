using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.AccessControl.Domain.Grants;

namespace Mbb.Archive.Modules.AccessControl.Infrastructure.Persistence.Configurations;

internal sealed class AccessGrantConfiguration : IEntityTypeConfiguration<AccessGrant>
{
    public void Configure(EntityTypeBuilder<AccessGrant> builder)
    {
        builder.ToTable("grants", "access");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ResourceType)
            .HasColumnName("resource_type").HasConversion<string>().HasMaxLength(40);

        builder.Property(x => x.ResourceKey)
            .HasColumnName("resource_key").HasMaxLength(200).IsRequired();

        builder.Property(x => x.SubjectType)
            .HasColumnName("subject_type").HasConversion<string>().HasMaxLength(40);

        builder.Property(x => x.SubjectKey)
            .HasColumnName("subject_key").HasMaxLength(300).IsRequired();

        builder.Property(x => x.Permission)
            .HasColumnName("permission").HasConversion<string>().HasMaxLength(20);

        builder.Property(x => x.ValidFrom).HasColumnName("valid_from");
        builder.Property(x => x.ValidTo).HasColumnName("valid_to");
        builder.Property(x => x.GrantedBy).HasColumnName("granted_by").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        // Kapsam hesabı her istekte özneye göre sorgular; indeks olmadan
        // paylaşım tablosu her belge listesinde tam tarama olur.
        builder.HasIndex(x => new { x.SubjectType, x.SubjectKey })
            .HasDatabaseName("ix_grants_subject");

        builder.HasIndex(x => new { x.ResourceType, x.ResourceKey })
            .HasDatabaseName("ix_grants_resource");
    }
}
