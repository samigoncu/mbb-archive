using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application;
using Mbb.Archive.Modules.Organization.Domain.Units;
using Mbb.Archive.Modules.Organization.Infrastructure.Directory;

using Mbb.Archive.Modules.Organization.Domain.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

public sealed class OrganizationDbContext : DbContext, IUnitOfWork<OrganizationBoundary>
{
    public OrganizationDbContext(DbContextOptions<OrganizationDbContext> options)
        : base(options)
    {
    }

    internal DbSet<DirectorySyncRun> DirectoryRuns => Set<DirectorySyncRun>();
    internal DbSet<OrganizationUnit> Units => Set<OrganizationUnit>();
    internal DbSet<OrganizationUnitTypeDefinition> UnitTypes => Set<OrganizationUnitTypeDefinition>();
    internal DbSet<UnitFilePlanAssignment> FilePlanAssignments => Set<UnitFilePlanAssignment>();
    internal DbSet<UnitMembership> Memberships => Set<UnitMembership>();
    internal DbSet<DirectorySettings> DirectorySettings => Set<DirectorySettings>();
    internal DbSet<DirectoryUserRecord> DirectoryUsers => Set<DirectoryUserRecord>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("organization");

        builder.Entity<DirectorySyncRun>(e =>
        {
            e.ToTable("directory_sync_runs"); e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(40); e.Property(x => x.SubjectId).HasColumnName("subject_id").HasMaxLength(200);
            e.Property(x => x.RequestedBy).HasColumnName("requested_by").HasMaxLength(300); e.Property(x => x.Status).HasColumnName("status").HasMaxLength(40);
            e.Property(x => x.Summary).HasColumnName("summary"); e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at"); e.HasIndex(x => x.StartedAt);
        });
        builder.Entity<OrganizationUnit>(unit =>
        {
            unit.ToTable("units");
            unit.HasKey(x => x.Id);

            unit.Property(x => x.Id)
                .HasColumnName("id")
                .HasConversion(id => id.Value, value => new OrganizationUnitId(value))
                .ValueGeneratedNever();

            unit.Property(x => x.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
            unit.Property(x => x.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
            unit.Property(x => x.ShortName).HasColumnName("short_name").HasMaxLength(40);

            unit.Property(x => x.ParentId)
                .HasColumnName("parent_id")
                .HasConversion(
                    id => id == null ? (Guid?)null : id.Value.Value,
                    value => value == null ? null : new OrganizationUnitId(value.Value));

            // Kapsam süzgeci bu sütun üzerinde önek eşleşmesi yapar; indeks
            // olmadan her belge listesi tam tarama olur.
            unit.Property(x => x.Path).HasColumnName("path").HasMaxLength(1000).IsRequired();
            unit.Property(x => x.Depth).HasColumnName("depth");
            unit.Property(x => x.ExternalReference).HasColumnName("external_reference").HasMaxLength(500);
            // Seviye kataloğuna kodla bağlanır: seviye yeniden adlandırılsa da
            // birim kaydı bozulmaz, yabancı anahtar kilitlenmesi yaşanmaz.
            unit.Property(x => x.TypeCode).HasColumnName("type_code").HasMaxLength(60);
            unit.Property(x => x.IsRemoved).HasColumnName("is_removed").HasDefaultValue(false);
            unit.Property(x => x.IsActive).HasColumnName("is_active");
            unit.Property(x => x.CreatedAt).HasColumnName("created_at");
            unit.Property(x => x.ConcurrencyVersion).HasColumnName("concurrency_version").IsConcurrencyToken();

            unit.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_units_code");
            unit.HasIndex(x => x.Path).HasDatabaseName("ix_units_path");
            unit.HasIndex(x => x.ParentId).HasDatabaseName("ix_units_parent");
            unit.HasIndex(x => x.TypeCode).HasDatabaseName("ix_units_type");
        });

        builder.Entity<OrganizationUnitTypeDefinition>(type =>
        {
            type.ToTable("unit_types");
            type.HasKey(x => x.Id);
            type.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            type.Property(x => x.Code).HasColumnName("code").HasMaxLength(60).IsRequired();
            type.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            type.Property(x => x.Level).HasColumnName("level");
            type.Property(x => x.CanHoldMembers).HasColumnName("can_hold_members");
            type.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            type.Property(x => x.IsBuiltIn).HasColumnName("is_built_in").HasDefaultValue(false);
            type.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_unit_types_code");
            type.Ignore(x => x.DomainEvents);
        });

        builder.Entity<UnitMembership>(membership =>
        {
            membership.ToTable("memberships");
            membership.HasKey(x => x.Id);

            membership.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            membership.Property(x => x.SubjectId).HasColumnName("subject_id").HasMaxLength(200).IsRequired();

            membership.Property(x => x.UnitId)
                .HasColumnName("unit_id")
                .HasConversion(id => id.Value, value => new OrganizationUnitId(value));

            membership.Property(x => x.IsPrimary).HasColumnName("is_primary");
            membership.Property(x => x.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(20);
            membership.Property(x => x.CreatedAt).HasColumnName("created_at");

            // Aynı özne aynı birime iki kez üye olamaz.
            membership.HasIndex(x => new { x.SubjectId, x.UnitId })
                .IsUnique()
                .HasDatabaseName("ux_memberships_subject_unit");

            membership.HasIndex(x => x.UnitId).HasDatabaseName("ix_memberships_unit");

            membership.HasOne<OrganizationUnit>()
                .WithMany()
                .HasForeignKey(x => x.UnitId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<UnitFilePlanAssignment>(assignment =>
        {
            assignment.ToTable("unit_file_plan_assignments");
            assignment.HasKey(x => new { x.UnitId, x.PlanId, x.ItemId });
            assignment.Property(x => x.UnitId).HasColumnName("unit_id").HasConversion(id => id.Value, value => new OrganizationUnitId(value));
            assignment.Property(x => x.PlanId).HasColumnName("plan_id");
            assignment.Property(x => x.ItemId).HasColumnName("item_id");
            assignment.Property(x => x.Code).HasColumnName("code").HasMaxLength(100);
            assignment.Property(x => x.Title).HasColumnName("title").HasMaxLength(1000);
            assignment.Property(x => x.Version).HasColumnName("version").HasMaxLength(100);
            assignment.HasOne<OrganizationUnit>().WithMany().HasForeignKey(x => x.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<DirectorySettings>(entity =>
        {
            entity.ToTable("directory_settings", "organization");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Host).HasColumnName("host").HasMaxLength(300);
            entity.Property(x => x.Port).HasColumnName("port");
            entity.Property(x => x.UseSsl).HasColumnName("use_ssl");
            entity.Property(x => x.BindDn).HasColumnName("bind_dn").HasMaxLength(1000);
            // Şifreli metin; anahtar Data Protection tarafından yönetilir.
            entity.Property(x => x.BindPasswordCipher).HasColumnName("bind_password_cipher").HasMaxLength(4000);
            entity.Property(x => x.UserSearchBase).HasColumnName("user_search_base").HasMaxLength(1000);
            entity.Property(x => x.UnitSearchBase).HasColumnName("unit_search_base").HasMaxLength(1000);
            entity.Property(x => x.UserFilter).HasColumnName("user_filter").HasMaxLength(1000);
            entity.Property(x => x.UnitFilter).HasColumnName("unit_filter").HasMaxLength(1000);
            entity.Property(x => x.UnitAttribute).HasColumnName("unit_attribute").HasMaxLength(200);
            entity.Property(x => x.GroupAttribute).HasColumnName("group_attribute").HasMaxLength(200);
            entity.Property(x => x.DisplayNameAttribute).HasColumnName("display_name_attribute").HasMaxLength(200);
            entity.Property(x => x.MailAttribute).HasColumnName("mail_attribute").HasMaxLength(200);
            entity.Property(x => x.TimeoutSeconds).HasColumnName("timeout_seconds");
            entity.Property(x => x.ProvisionOnLogin).HasColumnName("provision_on_login");
            entity.Property(x => x.IsEnabled).HasColumnName("is_enabled");
            entity.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken();
            entity.Property(x => x.UpdatedBy).HasColumnName("updated_by").HasMaxLength(300);
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.HasData(new DirectorySettings());
        });

        builder.Entity<DirectoryUserRecord>(entity =>
        {
            entity.ToTable("directory_users", "organization");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.SubjectId).HasColumnName("subject_id").HasMaxLength(300);
            entity.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(500);
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(500);
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(300);
            entity.Property(x => x.UnitReference).HasColumnName("unit_reference").HasMaxLength(1000);
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.Source).HasColumnName("source").HasMaxLength(40);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.LastSyncedAt).HasColumnName("last_synced_at");
            entity.Property(x => x.LastSeenAt).HasColumnName("last_seen_at");
            entity.HasIndex(x => x.SubjectId).IsUnique();
            entity.Ignore(x => x.DomainEvents);
        });

        base.OnModelCreating(builder);
    }
}
