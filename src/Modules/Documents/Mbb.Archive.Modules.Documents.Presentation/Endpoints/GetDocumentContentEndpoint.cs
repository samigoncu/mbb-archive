using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentContentEndpoint
{
    internal static RouteGroupBuilder MapGetDocumentContent(this RouteGroupBuilder group)
    {
        group.MapGet(
                "/{id:guid}/content",
                async (
                    Guid id,
                    bool? download,
                    GetDocumentContentQueryHandler handler,
                    HttpContext context,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentContentQuery(id),
                        cancellationToken);

                    if (result.IsFailure)
                        return ApiResults.Problem(result.Error);

                    var content = result.Value;

                    // Orijinal büyük olabilir; belleğe alınmadan doğrudan aktarılır.
                    context.Response.Headers.ContentDisposition =
                        (download == true ? "attachment" : "inline")
                        + $"; filename=\"{content.FileName}\"";

                    return Results.Stream(
                        content.Stream,
                        content.MimeType,
                        enableRangeProcessing: true);
                })
            .WithName("GetDocumentContent")
            .WithSummary("Streams the original bytes of the latest document version.");

        return group;
    }
}
