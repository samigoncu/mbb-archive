using System.Text.Json;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Artifacts;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Infrastructure.Indexing;

internal sealed class SearchIndexDocumentFactory
{
    private static readonly JsonSerializerOptions JsonOptions=new(JsonSerializerDefaults.Web);
    private readonly ISearchArtifactStore _artifacts;
    private readonly IDocumentSearchDatesProvider _dates;
    private readonly ICurrentVersionProjectionSource _versions;
    public SearchIndexDocumentFactory(ISearchArtifactStore artifacts, IDocumentSearchDatesProvider dates, ICurrentVersionProjectionSource versions){_artifacts=artifacts;_dates=dates;_versions=versions;}

    public async Task<OpenSearchIndexDocument> CreateAsync(SearchDocument source,CancellationToken ct)
    {
        var current = await _versions.GetAsync(source.Id, ct);
        var dates = await _dates.GetAsync(source.Id, ct)
            ?? throw new InvalidOperationException("Document dates are not available from the document source.");
        var textKey = current?.TextKey; var ocrKey = current?.OcrKey;
        var body=string.Empty;var pages=new List<OpenSearchPage>();
        if(!string.IsNullOrWhiteSpace(textKey))body=await _artifacts.ReadTextAsync(textKey,ct);
        if(!string.IsNullOrWhiteSpace(ocrKey))
        {
            var bytes=await _artifacts.ReadBytesAsync(ocrKey,ct);using var json=JsonDocument.Parse(bytes);
            if(json.RootElement.TryGetProperty("pages",out var pageArray))foreach(var page in pageArray.EnumerateArray()){var number=page.TryGetProperty("page_number",out var n)?n.GetInt32():page.GetProperty("pageNumber").GetInt32();var text=page.TryGetProperty("text",out var t)?t.GetString()??string.Empty:string.Empty;pages.Add(new OpenSearchPage(number,text));}
        }
        var classifications=JsonSerializer.Deserialize<List<SearchClassificationEntry>>(source.ClassificationJson,JsonOptions)??[];
        var metadata=JsonSerializer.Deserialize<List<SearchMetadataSchemaEntry>>(source.MetadataJson,JsonOptions)??[];
        var geo=ReadGeoRelations(source.GeoJson);
        return new OpenSearchIndexDocument(source.Id,current?.VersionId,source.Title,current?.MimeType,body,pages,classifications.Select(x=>$"{x.FilePlanCode}:{x.ItemCode}").Distinct().ToArray(),classifications.Select(x=>$"{x.FilePlanName} {x.ItemTitle}").Distinct().ToArray(),FlattenMetadata(metadata),geo.Select(x=>new OpenSearchGeoEntry(x.GeoEntityId.ToString("D"),x.Name,x.EntityType,x.LayerName,x.RelationType)).ToArray(),source.OwnerUnitPath,current?.TextKey,current?.OcrKey,source.Revision,source.UpdatedAt,dates.CreatedAt,dates.IngestedAt);
    }

    internal static IReadOnlyList<SearchGeoRelationEntry> ReadGeoRelations(string json)
    {
        using var value = JsonDocument.Parse(json);
        // Older projections represented an empty relation set as {}.
        // Only that exact empty form is compatible; malformed data still fails.
        if (value.RootElement.ValueKind == JsonValueKind.Object && !value.RootElement.EnumerateObject().Any()) return [];
        return JsonSerializer.Deserialize<List<SearchGeoRelationEntry>>(json, JsonOptions) ?? [];
    }

    private static IReadOnlyList<OpenSearchMetadataEntry> FlattenMetadata(IEnumerable<SearchMetadataSchemaEntry> schemas)
    {
        var result=new List<OpenSearchMetadataEntry>();
        foreach(var schema in schemas)foreach(var property in schema.Values.EnumerateObject())Flatten(result,$"{schema.SchemaKey}.{property.Name}",property.Value);
        return result;
    }
    private static void Flatten(List<OpenSearchMetadataEntry> target,string key,JsonElement value)
    {
        if(value.ValueKind==JsonValueKind.Array){foreach(var item in value.EnumerateArray())Flatten(target,key,item);return;}
        if(value.ValueKind==JsonValueKind.Object){foreach(var property in value.EnumerateObject())Flatten(target,$"{key}.{property.Name}",property.Value);return;}
        var raw=value.ValueKind==JsonValueKind.String?value.GetString()??string.Empty:value.GetRawText();target.Add(new OpenSearchMetadataEntry(key,raw,raw));
    }
}
