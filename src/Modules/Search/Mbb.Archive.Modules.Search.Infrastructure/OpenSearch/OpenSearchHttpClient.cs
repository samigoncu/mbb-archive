using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;

internal sealed class OpenSearchHttpClient : ISearchGateway
{
    private static readonly JsonSerializerOptions JsonOptions=new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http;
    private readonly OpenSearchOptions _options;

    public OpenSearchHttpClient(HttpClient http,IOptions<OpenSearchOptions> options)
    {
        _http=http;_options=options.Value;
        _http.BaseAddress=new Uri(_options.BaseUrl.TrimEnd('/')+"/");
        if(!string.IsNullOrWhiteSpace(_options.UserName))
        {
            var token=Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.UserName}:{_options.Password}"));
            _http.DefaultRequestHeaders.Authorization=new AuthenticationHeaderValue("Basic",token);
        }
    }

    public async Task EnsureIndexAsync(CancellationToken ct)
    {
        using var head=await _http.SendAsync(new HttpRequestMessage(HttpMethod.Head,_options.IndexName),ct);
        if(head.IsSuccessStatusCode)return;
        if(head.StatusCode!=HttpStatusCode.NotFound)head.EnsureSuccessStatusCode();
        var mapping=BuildMapping();
        using var create=await _http.PutAsync(_options.IndexName,new StringContent(mapping,Encoding.UTF8,"application/json"),ct);
        if(!create.IsSuccessStatusCode && create.StatusCode!=HttpStatusCode.BadRequest)create.EnsureSuccessStatusCode();
    }

    public async Task IndexAsync(OpenSearchIndexDocument document,CancellationToken ct)
    {
        await EnsureIndexAsync(ct);
        var payload=JsonSerializer.Serialize(document,JsonOptions);
        using var response=await _http.PutAsync($"{_options.IndexName}/_doc/{document.DocumentId:D}",new StringContent(payload,Encoding.UTF8,"application/json"),ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<SearchResponse> SearchAsync(SearchRequest request,CancellationToken ct)
    {
        await EnsureIndexAsync(ct);
        var body=BuildSearchBody(request);
        using var response=await _http.PostAsync($"{_options.IndexName}/_search",new StringContent(body,Encoding.UTF8,"application/json"),ct);
        response.EnsureSuccessStatusCode();
        var bytes=await response.Content.ReadAsByteArrayAsync(ct);
        return ParseSearchResponse(bytes);
    }

    private static string BuildMapping()=>"""
    {
      "settings": { "number_of_shards": 1, "number_of_replicas": 0 },
      "mappings": {
        "dynamic": "strict",
        "properties": {
          "documentId": { "type": "keyword" },
          "documentVersionId": { "type": "keyword" },
          "title": { "type": "text", "analyzer": "turkish", "fields": { "raw": { "type": "keyword", "ignore_above": 512 } } },
          "mimeType": { "type": "keyword" },
          "body": { "type": "text", "analyzer": "turkish" },
          "filePlanCodes": { "type": "keyword" },
          "filePlanTitles": { "type": "text", "analyzer": "turkish" },
          "pages": { "type": "nested", "properties": { "pageNumber": { "type": "integer" }, "text": { "type": "text", "analyzer": "turkish" } } },
          "metadataEntries": { "type": "nested", "properties": { "key": { "type": "keyword" }, "valueKeyword": { "type": "keyword", "ignore_above": 1024 }, "valueText": { "type": "text", "analyzer": "turkish" } } },
          "textArtifactStorageKey": { "type": "keyword", "index": false },
          "ocrJsonArtifactStorageKey": { "type": "keyword", "index": false },
          "projectionRevision": { "type": "long" },
          "updatedAt": { "type": "date" }
        }
      }
    }
    """;

    internal static string BuildSearchBody(SearchRequest request)
    {
        var filters=new List<object>();
        if(!string.IsNullOrWhiteSpace(request.MimeType))filters.Add(new{term=new Dictionary<string,string>{{"mimeType",request.MimeType}}});
        if(!string.IsNullOrWhiteSpace(request.FilePlanCode))filters.Add(new{term=new Dictionary<string,string>{{"filePlanCodes",request.FilePlanCode}}});
        if(!string.IsNullOrWhiteSpace(request.MetadataKey)&&!string.IsNullOrWhiteSpace(request.MetadataValue))
        {
            filters.Add(new{nested=new{path="metadataEntries",query=new{bool_=new{must=new object[]{new{term=new Dictionary<string,string>{{"metadataEntries.key",request.MetadataKey}}},new{term=new Dictionary<string,string>{{"metadataEntries.valueKeyword",request.MetadataValue}}}}}}}});
        }
        var fullTextClause=new{multi_match=new{query=request.Query,fields=new[]{"title^4","body^2","filePlanTitles"},type="best_fields",fuzziness="AUTO"}};
        // inner_hits nested sorgunun query'sinin içine değil, path/query ile kardeş
        // yazılır; query içine konursa OpenSearch [match] malformed query ile 400 döner.
        var pageClause=new{nested=new{path="pages",score_mode="max",query=new{match=new Dictionary<string,object>{{"pages.text",new{query=request.Query,fuzziness="AUTO"}}}},inner_hits=new{name="matched_pages",size=5,_source=new[]{"pages.pageNumber"},highlight=new{pre_tags=new[]{"<mark>"},post_tags=new[]{"</mark>"},fields=new Dictionary<string,object>{{"pages.text",new{fragment_size=180,number_of_fragments=3}}}}}}};
        var payload=new Dictionary<string,object?>
        {
            ["from"]=(request.Page-1)*request.PageSize,
            ["size"]=request.PageSize,
            ["track_total_hits"]=true,
            ["query"]=new{bool_=new{filter=filters,minimum_should_match=1,should=new object[]{fullTextClause,pageClause}}},
            ["highlight"]=new{pre_tags=new[]{"<mark>"},post_tags=new[]{"</mark>"},fields=new Dictionary<string,object>{{"title",new{}},{"body",new{fragment_size=180,number_of_fragments=3}}}},
            ["aggs"]=new{mime_types=new{terms=new{field="mimeType",size=30}},file_plan_codes=new{terms=new{field="filePlanCodes",size=100}}}
        };
        var json=JsonSerializer.Serialize(payload,JsonOptions);
        return json.Replace("\"bool_\"", "\"bool\"", StringComparison.Ordinal);
    }

    private static SearchResponse ParseSearchResponse(byte[] bytes)
    {
        using var json=JsonDocument.Parse(bytes);var root=json.RootElement;var hitsRoot=root.GetProperty("hits");
        var total=hitsRoot.GetProperty("total").GetProperty("value").GetInt64();var hits=new List<SearchHit>();
        foreach(var hit in hitsRoot.GetProperty("hits").EnumerateArray())
        {
            var source=hit.GetProperty("_source");var documentId=source.GetProperty("documentId").GetGuid();Guid? version=null;if(source.TryGetProperty("documentVersionId",out var v)&&v.ValueKind==JsonValueKind.String&&Guid.TryParse(v.GetString(),out var parsed))version=parsed;
            var fragments=new List<string>();if(hit.TryGetProperty("highlight",out var h)){foreach(var p in h.EnumerateObject())foreach(var f in p.Value.EnumerateArray())fragments.Add(f.GetString()??string.Empty);}
            var pages=new List<PageMatch>();if(hit.TryGetProperty("inner_hits",out var inner)&&inner.TryGetProperty("matched_pages",out var matched)){foreach(var ph in matched.GetProperty("hits").GetProperty("hits").EnumerateArray()){var ps=ph.GetProperty("_source");var pageNumber=ps.GetProperty("pageNumber").GetInt32();var pf=new List<string>();if(ph.TryGetProperty("highlight",out var phl)&&phl.TryGetProperty("pages.text",out var arr))foreach(var x in arr.EnumerateArray())pf.Add(x.GetString()??string.Empty);pages.Add(new PageMatch(pageNumber,pf));}}
            hits.Add(new SearchHit(documentId,version,source.GetProperty("title").GetString()??string.Empty,source.TryGetProperty("mimeType",out var m)?m.GetString():null,hit.TryGetProperty("_score",out var s)&&s.ValueKind==JsonValueKind.Number?s.GetDouble():0,fragments,pages));
        }
        var aggs=root.GetProperty("aggregations");return new SearchResponse(total,hits,ParseBuckets(aggs,"mime_types"),ParseBuckets(aggs,"file_plan_codes"));
    }
    private static IReadOnlyList<FacetBucket> ParseBuckets(JsonElement aggs,string name){var result=new List<FacetBucket>();if(!aggs.TryGetProperty(name,out var agg)||!agg.TryGetProperty("buckets",out var buckets))return result;foreach(var b in buckets.EnumerateArray())result.Add(new FacetBucket(b.GetProperty("key").GetString()??string.Empty,b.GetProperty("doc_count").GetInt64()));return result;}
}
