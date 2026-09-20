using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Collections.Application;
using Mbb.Archive.Modules.Collections.Domain.Collections;

namespace Mbb.Archive.Modules.Collections.Infrastructure.Persistence;

public sealed class CollectionsDbContext : DbContext, IUnitOfWork<CollectionsBoundary>
{
    public CollectionsDbContext(DbContextOptions<CollectionsDbContext> options)
        : base(options)
    {
    }

    internal DbSet<DocumentCollection> Collections => Set<DocumentCollection>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("collections");

        builder.Entity<DocumentCollection>(entity =>
        {
            entity.ToTable("collections");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .HasColumnName("id")
                .HasConversion(id => id.Value, value => new DocumentCollectionId(value))
                .ValueGeneratedNever();

            entity.Property(x => x.Name)
                .HasColumnName("name")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasColumnName("description")
                .HasMaxLength(1000);

            entity.Property(x => x.OwnerSubject)
                .HasColumnName("owner_subject")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.IsShared).HasColumnName("is_shared");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.ConcurrencyVersion)
                .HasColumnName("concurrency_version")
                .IsConcurrencyToken();

            entity.HasIndex(x => new { x.OwnerSubject, x.Name })
                .HasDatabaseName("ix_collections_owner_name");

            entity.HasMany(x => x.Items)
                .WithOne()
                .HasForeignKey(x => x.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Navigation(x => x.Items)
                .UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        builder.Entity<DocumentCollectionItem>(entity =>
        {
            entity.ToTable("collection_items");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();

            entity.Property(x => x.CollectionId)
                .HasColumnName("collection_id")
                .HasConversion(id => id.Value, value => new DocumentCollectionId(value));

            entity.Property(x => x.DocumentId).HasColumnName("document_id");

            entity.Property(x => x.AddedBy)
                .HasColumnName("added_by")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.AddedAt).HasColumnName("added_at");

            // Aynı belge bir koleksiyonda iki kez yer alamaz; kopya kayıt
            // oluşmaması veritabanı tarafında da güvenceye alınır (§20).
            entity.HasIndex(x => new { x.CollectionId, x.DocumentId })
                .IsUnique()
                .HasDatabaseName("ux_collection_items_collection_document");

            entity.HasIndex(x => x.DocumentId)
                .HasDatabaseName("ix_collection_items_document");
        });

        base.OnModelCreating(builder);
    }
}
