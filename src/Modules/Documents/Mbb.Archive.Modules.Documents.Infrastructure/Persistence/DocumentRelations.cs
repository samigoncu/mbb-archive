using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Mbb.Archive.Modules.Documents.Application.Relations;
using Mbb.Archive.Modules.Documents.Domain.Relations;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

internal sealed class DocumentRelationConfiguration : IEntityTypeConfiguration<DocumentRelation>
{
    public void Configure(EntityTypeBuilder<DocumentRelation> entity)
    {
        entity.ToTable("document_relations", DocumentsSchema.Name);
        entity.HasKey(x => x.Id); entity.Property(x => x.Id).ValueGeneratedNever();
        entity.Property(x => x.Kind).HasMaxLength(40); entity.Property(x => x.Note).HasMaxLength(1000);
        entity.Property(x => x.CreatedBy).HasMaxLength(300); entity.Property(x => x.ModifiedBy).HasMaxLength(300);
        entity.Property(x => x.Version).IsConcurrencyToken();
        entity.HasIndex(x => new { x.SourceDocumentId, x.TargetDocumentId, x.Kind }).HasDatabaseName("ux_document_relations_active_pair").IsUnique().HasFilter("\"RemovedAt\" IS NULL");
        entity.HasIndex(x => x.TargetDocumentId);
    }
}
internal sealed class DocumentRelations(DocumentsDbContext db) : IDocumentRelations
{
    public async Task<IReadOnlyList<DocumentRelation>> ListAsync(Guid id, CancellationToken ct) => await db.Set<DocumentRelation>().AsNoTracking()
        .Where(x => x.RemovedAt == null && (x.SourceDocumentId == id || x.TargetDocumentId == id)).OrderByDescending(x => x.CreatedAt).ToArrayAsync(ct);
    public Task<DocumentRelation?> GetAsync(Guid id, CancellationToken ct) => db.Set<DocumentRelation>().SingleOrDefaultAsync(x => x.Id == id && x.RemovedAt == null, ct);
    public Task<bool> ExistsAsync(Guid source, Guid target, string kind, Guid? except, CancellationToken ct) => db.Set<DocumentRelation>()
        .AnyAsync(x => x.SourceDocumentId == source && x.TargetDocumentId == target && x.Kind == kind && x.RemovedAt == null && x.Id != except, ct);
    public async Task AddAsync(DocumentRelation relation, CancellationToken ct) => await db.Set<DocumentRelation>().AddAsync(relation, ct);
}
