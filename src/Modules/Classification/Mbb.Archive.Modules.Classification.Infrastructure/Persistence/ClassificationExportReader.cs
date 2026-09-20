using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Classification.Contracts;

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence;

internal sealed class ClassificationExportReader(ClassificationDbContext db) : IClassificationExportReader
{
    public async Task<string> ReadMetadataJsonAsync(Guid documentId, CancellationToken cancellationToken)
    {
        var sets = await db.DocumentMetadataSets.AsNoTracking().Where(x => x.DocumentId == documentId)
            .OrderBy(x => x.SchemaVersion).ToListAsync(cancellationToken);
        var schemaIds = sets.Select(x => x.SchemaId).Distinct().ToArray();
        var schemas = await db.MetadataSchemas.AsNoTracking().Include(x => x.Fields)
            .Where(x => schemaIds.Contains(x.Id)).ToListAsync(cancellationToken);
        return JsonSerializer.Serialize(new
        {
            values = sets.Select(x => new { schemaId = x.SchemaId.Value, x.SchemaVersion, values = JsonSerializer.Deserialize<JsonElement>(x.ValuesJson), x.UpdatedAt }),
            schemas
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
}
