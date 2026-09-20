using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.BuildingBlocks.Application;
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
                    string? version,
                    GetDocumentContentQueryHandler handler,
                    HttpContext context,
                    CancellationToken cancellationToken) =>
                {
                    var number = 0;
                    if (version is not null && (!int.TryParse(version, out number) || number <= 0))
                        return ApiResults.Problem(Error.Validation("documents.invalid_version", "Sürüm numarası pozitif bir tam sayı olmalıdır."));
                    var result = await handler.Handle(
                        new GetDocumentContentQuery(id, version is null ? null : number),
                        cancellationToken);

                    if (result.IsFailure)
                        return ApiResults.Problem(result.Error);

                    var content = result.Value;

                    // Orijinal büyük olabilir; belleğe alınmadan doğrudan aktarılır.
                    context.Response.Headers.ContentDisposition =
                        (download == true ? "attachment" : "inline")
                        + $"; filename=\"{content.FileName}\"";
                    context.Response.Headers.CacheControl = "private, no-store";

                    return Results.Stream(
                        content.Stream,
                        content.MimeType,
                        enableRangeProcessing: true);
                })
            .RequireAuthorization("permission:documents.download")
            .WithAccessAudit(
                static http =>
                    http.Request.Query["download"] == "true"
                        ? "access.document-downloaded.v1"
                        : "access.document-previewed.v1",
                "document",
                "id")
            .WithName("GetDocumentContent")
            .WithSummary("Streams the selected version's original bytes; defaults to the latest version.");

        return group;
    }
}
