using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Application.Previews;

namespace Mbb.Archive.Modules.Processing.Presentation;

internal static class PreviewEndpoints
{
    public static void MapDocumentPreviewEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/processing/documents/{id:guid}/versions/{number:int}/text", async (Guid id, int number,
            DocumentVersionTextHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, number, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:documents.read").WithTags("Processing")
            .WithAccessAudit("access.document-version-text-viewed.v1", "document", "id");
        endpoints.MapGet("/api/v1/processing/documents/{id:guid}/preview", async (Guid id, string? version, DocumentPreviewHandler handler, CancellationToken ct) =>
        {
            var number = 0;
            if (version is not null && (!int.TryParse(version, out number) || number <= 0))
                return ApiResults.Problem(Error.Validation("processing.invalid_version", "Sürüm numarası pozitif bir tam sayı olmalıdır."));
            var result = await handler.GetStateAsync(id, ct, version is null ? null : number);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:documents.read").WithTags("Processing");
        endpoints.MapGet("/api/v1/processing/documents/{id:guid}/preview/content", async (
            Guid id, bool? download, string? version, HttpContext context, DocumentPreviewHandler handler, CancellationToken ct) =>
        {
            var number = 0;
            if (version is not null && (!int.TryParse(version, out number) || number <= 0))
                return ApiResults.Problem(Error.Validation("processing.invalid_version", "Sürüm numarası pozitif bir tam sayı olmalıdır."));
            var result = await handler.OpenAsync(id, ct, version is null ? null : number);
            if (result.IsFailure) return ApiResults.Problem(result.Error);
            context.Response.Headers.ContentDisposition = (download == true ? "attachment" : "inline") + $"; filename=\"{id}{(version is null ? "" : $"-v{number}")}-preview.pdf\"";
            context.Response.Headers.CacheControl = "private, no-store";
            return Results.Stream(result.Value, "application/pdf", enableRangeProcessing: result.Value.CanSeek);
        }).RequireAuthorization("permission:documents.download").WithTags("Processing")
            .WithAccessAudit(static http => http.Request.Query["download"] == "true"
                ? "access.document-pdf-downloaded.v1" : "access.document-pdf-previewed.v1", "document", "id");
    }
}
