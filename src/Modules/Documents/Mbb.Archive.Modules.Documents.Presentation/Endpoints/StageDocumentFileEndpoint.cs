using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.RateLimiting;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.StageFile;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class StageDocumentFileEndpoint
{
    private const string FileNameHeader = "X-File-Name";

    internal static RouteGroupBuilder MapStageDocumentFile(this RouteGroupBuilder group)
    {
        group.MapPost(
                "/{id:guid}/files",
                async (
                    Guid id,
                    HttpRequest request,
                    StageDocumentFileCommandHandler handler,
                    CancellationToken cancellationToken) =>
                {
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

                    var result = await handler.Handle(
                        new StageDocumentFileCommand(
                            id,
                            fileName,
                            contentType,
                            request.ContentLength.Value,
                            request.Body),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Accepted(
                            $"/api/v1/documents/{id}",
                            result.Value);
                })
            .RequireRateLimiting("uploads")
            .WithName("StageDocumentFile")
            .WithSummary("Streams an original file into quarantine/staging.")
            .WithDescription(
                "The client filename is supplied in X-File-Name. " +
                "The body is streamed and SHA-256 is calculated without loading the full file into memory.");

        return group;
    }
}
