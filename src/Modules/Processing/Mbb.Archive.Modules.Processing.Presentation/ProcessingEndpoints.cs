using Microsoft.AspNetCore.Builder;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;

namespace Mbb.Archive.Modules.Processing.Presentation;

public static class ProcessingEndpoints
{
    public static IEndpointRouteBuilder MapProcessingEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/processing/jobs", async (int? page, int? pageSize, string? stage, IProcessingQueries queries, CancellationToken ct) =>
        {
            var request = PageRequest.Create(page ?? 1, pageSize ?? 25);
            return request.IsFailure ? ApiResults.Problem(request.Error) : Results.Ok(await queries.ListAsync(request.Value,stage,ct));
        }).RequireAuthorization("permission:documents.read").WithTags("Processing");
        endpoints.MapGet(
                "/api/v1/processing/jobs/{id:guid}",
                async (
                    Guid id,
                    GetProcessingJobByIdQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetProcessingJobByIdQuery(id),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .WithTags("Processing")
            .RequireAuthorization("permission:documents.read")
            .WithName("GetProcessingJobById")
            .WithSummary("Gets a document processing job.");

        endpoints.MapPost("/api/v1/processing/documents/{id:guid}/reprocess", async (
            Guid id,
            Guid? expectedJobId,
            Mbb.Archive.Modules.Processing.Application.Jobs.Reprocess.ReprocessDocumentHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.Handle(id, ct, expectedJobId);
            return result.IsFailure ? ApiResults.Problem(result.Error)
                : Results.Accepted($"/api/v1/processing/jobs/{result.Value}", new { jobId = result.Value });
        }).RequireAuthorization("permission:documents.write")
            .WithTags("Processing")
            .WithAccessAudit("access.document-reprocess-requested.v1", "document", "id");

        endpoints.MapDocumentPreviewEndpoints();
        return endpoints;
    }
}
