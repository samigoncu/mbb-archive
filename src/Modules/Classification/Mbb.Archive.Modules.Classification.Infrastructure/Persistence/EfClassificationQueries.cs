using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
using Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;
namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;
internal sealed class EfClassificationQueries : IClassificationQueries
{
 private readonly ClassificationDbContext _db;public EfClassificationQueries(ClassificationDbContext db){_db=db;}
 public async Task<PagedResult<FilePlanListItem>> GetFilePlansAsync(PageRequest page,CancellationToken ct)
 {
  var query=_db.FilePlans.AsNoTracking();
  var totalCount=await query.LongCountAsync(ct);
  var rows=await query.OrderBy(x=>x.Code).Skip((page.Page-1)*page.PageSize).Take(page.PageSize)
   .Select(x=>new FilePlanListItem(x.Id.Value,x.Code,x.Name,x.Version,x.Authority,x.EffectiveFrom,x.EffectiveTo,x.IsActive,x.Items.Count()))
   .ToListAsync(ct);
  return new PagedResult<FilePlanListItem>(rows,page.Page,page.PageSize,totalCount);
 }
 public async Task<PagedResult<MetadataSchemaListItem>> GetMetadataSchemasAsync(PageRequest page,CancellationToken ct)
 {
  var query=_db.MetadataSchemas.AsNoTracking();
  var totalCount=await query.LongCountAsync(ct);
  var rows=await query.OrderBy(x=>x.Key).ThenBy(x=>x.Version).Skip((page.Page-1)*page.PageSize).Take(page.PageSize)
   .Select(x=>new MetadataSchemaListItem(x.Id.Value,x.Key,x.Name,x.Version,x.Status.ToString(),x.CreatedAt,x.PublishedAt,x.Fields.Count()))
   .ToListAsync(ct);
  return new PagedResult<MetadataSchemaListItem>(rows,page.Page,page.PageSize,totalCount);
 }
 public async Task<FilePlanTree?> GetFilePlanTreeAsync(Guid id,CancellationToken ct){var plan=await _db.FilePlans.AsNoTracking().Include(x=>x.Items).SingleOrDefaultAsync(x=>x.Id==new FilePlanId(id),ct);return plan is null?null:new FilePlanTree(plan.Id.Value,plan.Code,plan.Name,plan.Version,plan.Authority,plan.EffectiveFrom,plan.EffectiveTo,plan.Items.OrderBy(x=>x.Code).Select(x=>new FilePlanNode(x.Id.Value,x.ParentId?.Value,x.Code,x.Title,x.Level,x.IsSelectable,x.IsActive,x.Description)).ToArray());}
 public async Task<MetadataSchemaDetails?> GetMetadataSchemaAsync(Guid id,CancellationToken ct){var schema=await _db.MetadataSchemas.AsNoTracking().Include(x=>x.Fields).SingleOrDefaultAsync(x=>x.Id==new MetadataSchemaId(id),ct);return schema is null?null:new MetadataSchemaDetails(schema.Id.Value,schema.Key,schema.Name,schema.Version,schema.Status.ToString(),schema.CreatedAt,schema.PublishedAt,schema.Fields.OrderBy(x=>x.Key).Select(x=>new MetadataFieldDetails(x.Id,x.Key,x.Label,x.FieldType.ToString(),x.IsRequired,x.IsSearchable,x.IsRepeatable,x.OptionsJson)).ToArray());}
 public Task<bool> HasDocumentClassificationsAsync(Guid filePlanItemId,CancellationToken ct)
  => _db.DocumentClassifications.AsNoTracking().AnyAsync(x=>x.FilePlanItemId==new FilePlanItemId(filePlanItemId),ct);
}
