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
    private static int _mappingSynced;
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

        if(head.IsSuccessStatusCode)
        {
            await SyncMappingAsync(ct);
            return;
        }

        if(head.StatusCode!=HttpStatusCode.NotFound)head.EnsureSuccessStatusCode();
        var mapping=BuildMapping();
        using var create=await _http.PutAsync(_options.IndexName,new StringContent(mapping,Encoding.UTF8,"application/json"),ct);
        if(!create.IsSuccessStatusCode && create.StatusCode!=HttpStatusCode.BadRequest)create.EnsureSuccessStatusCode();
        Interlocked.Exchange(ref _mappingSynced,1);
    }

    /// <summary>
    /// İndeks `dynamic: strict` olduğu için yeni alan eklendiğinde mevcut
    /// indeksin eşlemesi güncellenmezse belgeler reddedilir. Alan ekleme
    /// eklemeli bir işlemdir; yeniden indeksleme gerektirmez. Süreç başına
    /// bir kez çalışır.
    /// </summary>
    private async Task SyncMappingAsync(CancellationToken ct)
    {
        if(Interlocked.CompareExchange(ref _mappingSynced,1,0)!=0)return;

        using var response=await _http.PutAsync(
            $"{_options.IndexName}/_mapping",
            new StringContent(BuildMappingProperties(),Encoding.UTF8,"application/json"),
            ct);

        if(!response.IsSuccessStatusCode)
        {
            // Eşleme güncellenemezse bir sonraki denemede tekrar denensin.
            Interlocked.Exchange(ref _mappingSynced,0);
            response.EnsureSuccessStatusCode();
        }
    }

    private static string BuildMappingProperties()
    {
        using var document=JsonDocument.Parse(BuildMapping());
        var properties=document.RootElement.GetProperty("mappings").GetProperty("properties");
        return $$"""{"properties": {{properties.GetRawText()}}}""";
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
          "geoEntities": { "type": "nested", "properties": { "geoEntityId": { "type": "keyword" }, "name": { "type": "text", "analyzer": "turkish", "fields": { "raw": { "type": "keyword", "ignore_above": 512 } } }, "entityType": { "type": "keyword" }, "layerName": { "type": "keyword" }, "relationType": { "type": "keyword" } } },
          "ownerUnitPath": { "type": "keyword" },
          "textArtifactStorageKey": { "type": "keyword", "index": false },
          "ocrJsonArtifactStorageKey": { "type": "keyword", "index": false },
          "projectionRevision": { "type": "long" },
          "updatedAt": { "type": "date" },
          "createdAt": { "type": "date" },
          "ingestedAt": { "type": "date" }
        }
      }
    }
    """;

    internal static string BuildSearchBody(SearchRequest request)
    {
        var filters=new List<object>();

        // Kapsam süzgeci ilk sıraya konur ve hiçbir koşulda atlanmaz. Kapsam
        // üstü izin yoksa yalnız izinli birim yolları ve doğrudan paylaşılan
        // belgeler eşleşir; sahibi olmayan belge hiç dönmez.
        if(!request.Scope.Unrestricted)
        {
            var allowed=new List<object>();

            foreach(var path in request.Scope.UnitPaths)
                allowed.Add(new{prefix=new Dictionary<string,string>{{"ownerUnitPath",path}}});

            if(request.Scope.GrantedDocumentIds.Count>0)
                allowed.Add(new{terms=new Dictionary<string,object>{{"documentId",request.Scope.GrantedDocumentIds.Select(x=>x.ToString("D")).ToArray()}}});

            // Dosya planı dalı paylaşımı: indeks kalem kodlarını
            // "<plan>:<kalem>" biçiminde tuttuğu için son parça karşılaştırılır.
            foreach(var code in request.Scope.GrantedFilePlanCodes)
                allowed.Add(new{wildcard=new Dictionary<string,string>{{"filePlanCodes",$"*:{code}"}}});

            // Sözlük anahtarı kullanılıyor: anonim tipte "bool" ayrılmış sözcük
            // olduğu için "bool_" yer tutucusu gerekir ve o yer tutucu sorgunun
            // yalnız bir kısmında değiştiriliyordu — sessizce geçersiz sorgu
            // üretiyordu. Sözlükte böyle bir kısıt yok.
            filters.Add(
                allowed.Count==0
                    ? new Dictionary<string,object>{{"match_none",new{}}}
                    : new Dictionary<string,object>
                      {
                          {"bool",new Dictionary<string,object>
                              {
                                  {"should",allowed},
                                  {"minimum_should_match",1}
                              }}
                      });
        }
        if (request.From is not null || request.To is not null)
        {
            var bounds = new Dictionary<string, object> { ["time_zone"] = "Europe/Istanbul" };
            if (request.From is { } from) bounds["gte"] = from.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            // An exclusive next-day bound includes the whole selected end day.
            if (request.To is { } to) bounds["lt"] = to.AddDays(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            filters.Add(new { range = new Dictionary<string, object> { [request.DateField] = bounds } });
        }
        var excluded=new List<object>();
        foreach (var ids in (request.ExcludedDocumentIds ?? []).Chunk(1000))
            excluded.Add(new { terms = new Dictionary<string, object> { ["documentId"] = ids.Select(id => id.ToString("D")).ToArray() } });
        foreach (var condition in request.Conditions ?? [])
        {
            var clause = OpenSearchConditionQuery.Build(condition);
            if (condition.Operator is "notContains" or "notEquals") excluded.Add(clause);
            else filters.Add(clause);
        }
        if(!string.IsNullOrWhiteSpace(request.MimeType))filters.Add(new{term=new Dictionary<string,string>{{"mimeType",request.MimeType}}});
        if(!string.IsNullOrWhiteSpace(request.FilePlanCode))filters.Add(new{term=new Dictionary<string,string>{{"filePlanCodes",request.FilePlanCode}}});
        if(!string.IsNullOrWhiteSpace(request.MetadataKey)&&!string.IsNullOrWhiteSpace(request.MetadataValue))
        {
            filters.Add(OpenSearchConditionQuery.Build(new SearchCondition($"metadata:{request.MetadataKey}", "equals", request.MetadataValue)));
        }
        // Kısa Türkçe köklerde fuzzy eşleşme ilgisiz sözcükleri de vurgular
        // (hal/hat, yol/yıl). Her arama terimi hatasız eşleşmelidir.
        var lastTerm = (request.Query ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "";
        var prefixSearch = lastTerm.Length >= 4;
        var matchType = prefixSearch ? "match_bool_prefix" : "match";
        var fullTextClause=new{multi_match=new{query=request.Query,fields=new[]{"title^4","body^2","filePlanTitles"},type=prefixSearch ? "bool_prefix" : "best_fields",@operator="and",fuzziness=0}};
        // inner_hits nested sorgunun query'sinin içine değil, path/query ile kardeş
        // yazılır; query içine konursa OpenSearch [match] malformed query ile 400 döner.
        var geoClause=new{nested=new{path="geoEntities",score_mode="max",query=new Dictionary<string,object>{{matchType,new Dictionary<string,object>{{"geoEntities.name",new{query=request.Query,@operator="and",fuzziness=0,boost=8.0}}}}},inner_hits=new{name="matched_geo",size=5,_source=new[]{"geoEntities.name","geoEntities.entityType","geoEntities.relationType"}}}};
        var pageClause=new{nested=new{path="pages",score_mode="max",query=new Dictionary<string,object>{{matchType,new Dictionary<string,object>{{"pages.text",new{query=request.Query,@operator="and",fuzziness=0}}}}},inner_hits=new{name="matched_pages",size=5,_source=new[]{"pages.pageNumber"},highlight=new{pre_tags=new[]{"<mark>"},post_tags=new[]{"</mark>"},fields=new Dictionary<string,object>{{"pages.text",new{fragment_size=180,number_of_fragments=3}}}}}}};
        var payload=new Dictionary<string,object?>
        {
            ["from"]=(request.Page-1)*request.PageSize,
            ["size"]=request.PageSize,
            ["track_total_hits"]=true,
            ["query"]=new Dictionary<string,object>{["bool"]=new{filter=filters,must_not=excluded,minimum_should_match=string.IsNullOrWhiteSpace(request.Query)?0:1,should=string.IsNullOrWhiteSpace(request.Query)?Array.Empty<object>():new object[]{fullTextClause,pageClause,geoClause}}},
            ["highlight"]=new{pre_tags=new[]{"<mark>"},post_tags=new[]{"</mark>"},fields=new Dictionary<string,object>{{"title",new{}},{"body",new{fragment_size=180,number_of_fragments=3}}}},
            ["aggs"]=new{mime_types=new{terms=new{field="mimeType",size=30}},file_plan_codes=new{terms=new{field="filePlanCodes",size=100}}}
        };
        var (sortField, direction) = request.Sort switch
        {
            "title_asc" => ("title.raw", "asc"), "title_desc" => ("title.raw", "desc"),
            "newest" => ("ingestedAt", "desc"), "oldest" => ("ingestedAt", "asc"),
            _ => ("_score", "desc")
        };
        payload["sort"] = new object[] { new Dictionary<string, object> { [sortField] = new { order = direction } },
            new Dictionary<string, object> { ["documentId"] = new { order = "asc" } } };
        return JsonSerializer.Serialize(payload,JsonOptions);
    }

    private static SearchResponse ParseSearchResponse(byte[] bytes)
    {
        using var json=JsonDocument.Parse(bytes);var root=json.RootElement;var hitsRoot=root.GetProperty("hits");
        var total=hitsRoot.GetProperty("total").GetProperty("value").GetInt64();var hits=new List<SearchHit>();
        foreach(var hit in hitsRoot.GetProperty("hits").EnumerateArray())
        {
            var source=hit.GetProperty("_source");var documentId=source.GetProperty("documentId").GetGuid();Guid? version=null;if(source.TryGetProperty("documentVersionId",out var v)&&v.ValueKind==JsonValueKind.String&&Guid.TryParse(v.GetString(),out var parsed))version=parsed;
            var fragments=new List<string>();if(hit.TryGetProperty("highlight",out var h)){foreach(var p in h.EnumerateObject())foreach(var f in p.Value.EnumerateArray())fragments.Add(f.GetString()??string.Empty);}
            var pages=new List<PageMatch>();var geo=new List<GeoMatch>();
            if(hit.TryGetProperty("inner_hits",out var inner))
            {
                if(inner.TryGetProperty("matched_pages",out var matched)){foreach(var ph in matched.GetProperty("hits").GetProperty("hits").EnumerateArray()){var ps=ph.GetProperty("_source");var pageNumber=ps.GetProperty("pageNumber").GetInt32();var pf=new List<string>();if(ph.TryGetProperty("highlight",out var phl)&&phl.TryGetProperty("pages.text",out var arr))foreach(var x in arr.EnumerateArray())pf.Add(x.GetString()??string.Empty);pages.Add(new PageMatch(pageNumber,pf));}}
                if(inner.TryGetProperty("matched_geo",out var matchedGeo)){foreach(var gh in matchedGeo.GetProperty("hits").GetProperty("hits").EnumerateArray()){var gs=gh.GetProperty("_source");geo.Add(new GeoMatch(gs.GetProperty("name").GetString()??string.Empty,gs.TryGetProperty("entityType",out var et)?et.GetString()??string.Empty:string.Empty,gs.TryGetProperty("relationType",out var rt)?rt.GetString()??string.Empty:string.Empty));}}
            }
            hits.Add(new SearchHit(documentId,version,source.GetProperty("title").GetString()??string.Empty,source.TryGetProperty("mimeType",out var m)?m.GetString():null,hit.TryGetProperty("_score",out var s)&&s.ValueKind==JsonValueKind.Number?s.GetDouble():0,fragments,pages,geo,ReadDate(source,"createdAt"),ReadDate(source,"ingestedAt")));
        }
        var aggs=root.GetProperty("aggregations");return new SearchResponse(total,hits,ParseBuckets(aggs,"mime_types"),ParseBuckets(aggs,"file_plan_codes"));
    }
    private static DateTimeOffset? ReadDate(JsonElement source, string field)
        => source.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.String
            && value.TryGetDateTimeOffset(out var date) ? date : null;
    private static IReadOnlyList<FacetBucket> ParseBuckets(JsonElement aggs,string name){var result=new List<FacetBucket>();if(!aggs.TryGetProperty(name,out var agg)||!agg.TryGetProperty("buckets",out var buckets))return result;foreach(var b in buckets.EnumerateArray())result.Add(new FacetBucket(b.GetProperty("key").GetString()??string.Empty,b.GetProperty("doc_count").GetInt64()));return result;}
}
