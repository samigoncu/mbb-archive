using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Search.Application.Documents.Highlights;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
namespace Mbb.Archive.Modules.Search.Presentation;
public static class SearchEndpoints
{
    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/search/documents",async(string q,int? page,int? pageSize,string? mimeType,string? filePlanCode,string? metadataKey,string? metadataValue,SearchDocumentsQueryHandler handler,CancellationToken ct)=>{var result=await handler.Handle(new SearchDocumentsQuery(q,page??1,pageSize??25,mimeType,filePlanCode,metadataKey,metadataValue),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}).WithTags("Search").RequireAuthorization().WithName("SearchDocuments");
        endpoints.MapGet("/api/v1/search/documents/{documentId:guid}/highlights",async(Guid documentId,string q,int? page,GetHighlightBoxesQueryHandler handler,CancellationToken ct)=>{var result=await handler.Handle(new GetHighlightBoxesQuery(documentId,q,page),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}).WithTags("Search").RequireAuthorization().WithName("GetOcrHighlightBoxes");
        return endpoints;
    }
}
