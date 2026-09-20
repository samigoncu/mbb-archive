using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.RateLimiting;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.StageFile;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class StageDocumentFileEndpoint
{
    private const string FileNameHeader = "X-File-Name";
    private const string ReasonHeader = "X-Version-Reason";

    internal static RouteGroupBuilder MapStageDocumentFile(this RouteGroupBuilder group)
    {
        group.MapPost(
                "/{id:guid}/files",
                async (
                    Guid id,
                    HttpRequest request,
                    HttpContext context,
                    StageDocumentFileCommandHandler handler,
                    Mbb.Archive.Modules.Documents.Application.Settings.UploadPolicyHandler policyHandler,
                    CancellationToken cancellationToken) =>
                {
                    var policy = await policyHandler.GetAsync(cancellationToken);
                    if (request.ContentLength > policy.MaxUploadBytes)
                    {
                        return Results.Problem(
                            statusCode: StatusCodes.Status413PayloadTooLarge,
                            detail: $"Dosya boyutu {policy.MaxFileSizeMb} MB sınırını aşıyor.");
                    }

                    // Raise Kestrel's default only for the raw file upload, before reading it.
                    var bodySize = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
                    if (bodySize is { IsReadOnly: false })
                        bodySize.MaxRequestBodySize = policy.MaxUploadBytes;

                    var encodedFileName = request.Headers[FileNameHeader].ToString();
                    var fileName = Uri.UnescapeDataString(encodedFileName);

                    if (string.IsNullOrWhiteSpace(fileName))
                    {
                        return ApiResults.Problem(
                            StageDocumentFileErrors.FileNameRequired);
                    }

                    if (request.ContentLength is null or <= 0)
                    {
                        return ApiResults.Problem(
                            StageDocumentFileErrors.InvalidSize);
                    }

                    var contentType =
                        request.ContentType ?? "application/octet-stream";

                    // §5: sürüm gerekçesi başlıkla taşınır; ilk yüklemede boş
                    // bırakılabilir, düzeltme sürümlerinde anlamlıdır.
                    var reason = Uri.UnescapeDataString(
                        request.Headers[ReasonHeader].ToString());

                    var submittedBy =
                        context.User.FindFirst("sub")?.Value
                        ?? context.User.Identity?.Name
                        ?? string.Empty;

                    var result = await handler.Handle(
                        new StageDocumentFileCommand(
                            id,
                            fileName,
                            contentType,
                            request.ContentLength.Value,
                            request.Body,
                            submittedBy,
                            reason),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Accepted(
                            $"/api/v1/documents/{id}",
                            result.Value);
                })
            .RequireRateLimiting("uploads")
            .RequireAuthorization("permission:documents.write")
            .WithName("StageDocumentFile")
            .WithSummary("Streams an original file into quarantine/staging.")
            .WithDescription(
                "The client filename is supplied in X-File-Name. " +
                "The body is streamed and SHA-256 is calculated without loading the full file into memory.");

        return group;
    }
}
