using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;
internal sealed class EfClassificationRepository : IClassificationRepository
{
 private readonly ClassificationDbContext _db;public EfClassificationRepository(ClassificationDbContext db){_db=db;}
 public async Task AddFilePlanAsync(FilePlan plan,CancellationToken ct)=>await _db.FilePlans.AddAsync(plan,ct);
 public Task<FilePlan?> GetFilePlanAsync(FilePlanId id,CancellationToken ct)=>_db.FilePlans.Include(x=>x.Items).SingleOrDefaultAsync(x=>x.Id==id,ct);
 public async Task AddSchemaAsync(MetadataSchema schema,CancellationToken ct)=>await _db.MetadataSchemas.AddAsync(schema,ct);
 public Task<MetadataSchema?> GetSchemaAsync(MetadataSchemaId id,CancellationToken ct)=>_db.MetadataSchemas.Include(x=>x.Fields).SingleOrDefaultAsync(x=>x.Id==id,ct);
 public async Task AddClassificationAsync(DocumentClassification value,CancellationToken ct)=>await _db.DocumentClassifications.AddAsync(value,ct);
 public async Task AddMetadataSetAsync(DocumentMetadataSet value,CancellationToken ct)=>await _db.DocumentMetadataSets.AddAsync(value,ct);
 public Task<DocumentMetadataSet?> GetMetadataSetAsync(Guid documentId,MetadataSchemaId schemaId,CancellationToken ct)=>_db.DocumentMetadataSets.SingleOrDefaultAsync(x=>x.DocumentId==documentId&&x.SchemaId==schemaId,ct);
}
