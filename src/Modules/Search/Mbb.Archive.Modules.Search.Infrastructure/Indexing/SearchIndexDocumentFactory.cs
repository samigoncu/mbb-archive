using System.Text.Json;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Search.Infrastructure.Artifacts;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

namespace Mbb.Archive.Modules.Search.Infrastructure.Indexing;

internal sealed class SearchIndexDocumentFactory
{
    private static readonly JsonSerializerOptions JsonOptions=new(JsonSerializerDefaults.Web);
    private readonly ISearchArtifactStore _artifacts;
    public SearchIndexDocumentFactory(ISearchArtifactStore artifacts){_artifacts=artifacts;}

    public async Task<OpenSearchIndexDocument> CreateAsync(SearchDocument source,CancellationToken ct)
    {
        var body=string.Empty;var pages=new List<OpenSearchPage>();
        if(!string.IsNullOrWhiteSpace(source.TextArtifactStorageKey))body=await _artifacts.ReadTextAsync(source.TextArtifactStorageKey,ct);
        if(!string.IsNullOrWhiteSpace(source.OcrJsonArtifactStorageKey))
        {
            var bytes=await _artifacts.ReadBytesAsync(source.OcrJsonArtifactStorageKey,ct);using var json=JsonDocument.Parse(bytes);
            if(json.RootElement.TryGetProperty("pages",out var pageArray))foreach(var page in pageArray.EnumerateArray()){var number=page.TryGetProperty("page_number",out var n)?n.GetInt32():page.GetProperty("pageNumber").GetInt32();var text=page.TryGetProperty("text",out var t)?t.GetString()??string.Empty:string.Empty;pages.Add(new OpenSearchPage(number,text));}
        }
        var classifications=JsonSerializer.Deserialize<List<SearchClassificationEntry>>(source.ClassificationJson,JsonOptions)??[];
        var metadata=JsonSerializer.Deserialize<List<SearchMetadataSchemaEntry>>(source.MetadataJson,JsonOptions)??[];
        return new OpenSearchIndexDocument(source.Id,source.DocumentVersionId,source.Title,source.MimeType,body,pages,classifications.Select(x=>$"{x.FilePlanCode}:{x.ItemCode}").Distinct().ToArray(),classifications.Select(x=>$"{x.FilePlanName} {x.ItemTitle}").Distinct().ToArray(),FlattenMetadata(metadata),source.TextArtifactStorageKey,source.OcrJsonArtifactStorageKey,source.Revision,source.UpdatedAt);
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
