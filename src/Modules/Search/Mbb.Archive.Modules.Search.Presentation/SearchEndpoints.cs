using System.Text.Json;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Search.Application.Documents.Highlights;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
using Mbb.Archive.Modules.Search.Application.Documents.Text;
namespace Mbb.Archive.Modules.Search.Presentation;
public static class SearchEndpoints
{
    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/search/documents", async (string? q, int? page, int? pageSize,
            string? mimeType, string? filePlanCode, string? metadataKey, string? metadataValue,
            string? conditions, DateOnly? from, DateOnly? to, string? dateField, string? sort,
            SearchDocumentsQueryHandler handler, CancellationToken ct) =>
        {
            IReadOnlyList<SearchCondition>? parsed = null;
            if (conditions is not null)
            {
                if (conditions.Length > 8000)
                    return Results.BadRequest(new { detail = "Arama koşulları çok uzun." });
                try
                {
                    parsed = JsonSerializer.Deserialize<SearchCondition[]>(conditions, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                    if (parsed is null) return Results.BadRequest(new { detail = "Arama koşulları bir liste olmalıdır." });
                }
                catch (JsonException)
                {
                    return Results.BadRequest(new { detail = "Arama koşulları okunamadı." });
                }
            }
            var result = await handler.Handle(new SearchDocumentsQuery(q ?? "", page ?? 1, pageSize ?? 25,
                mimeType, filePlanCode, metadataKey, metadataValue, parsed, from, to, dateField ?? "ingestedAt", sort ?? "relevance"), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).WithTags("Search").RequireAuthorization("permission:search.read").WithName("SearchDocuments")
            .WithAccessAudit("access.search-performed.v1", "search");
        endpoints.MapGet("/api/v1/search/documents/{documentId:guid}/highlights",async(Guid documentId,string q,int? page,GetHighlightBoxesQueryHandler handler,CancellationToken ct)=>{var result=await handler.Handle(new GetHighlightBoxesQuery(documentId,q,page),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}).WithTags("Search").RequireAuthorization("permission:search.read").WithName("GetOcrHighlightBoxes");
        endpoints.MapGet("/api/v1/search/documents/{documentId:guid}/text",async(Guid documentId,GetDocumentTextQueryHandler handler,CancellationToken ct)=>{var result=await handler.Handle(new GetDocumentTextQuery(documentId),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}).WithTags("Search").RequireAuthorization("permission:search.read").WithName("GetDocumentText").WithAccessAudit("access.document-text-viewed.v1", "document", "documentId");
        return endpoints;
    }
}
