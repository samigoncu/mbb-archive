using Microsoft.AspNetCore.Builder;
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
            .WithName("GetProcessingJobById")
            .WithSummary("Gets a document processing job.");

        return endpoints;
    }
}
