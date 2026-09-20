using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIntegrity;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentIntegrityEndpoint
{
    internal static RouteGroupBuilder MapGetDocumentIntegrity(
        this RouteGroupBuilder group)
    {
        group.MapGet(
                "/{id:guid}/integrity",
                async (
                    Guid id,
                    GetDocumentIntegrityQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentIntegrityQuery(id),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .RequireAuthorization("permission:documents.read")
            .WithName("GetDocumentIntegrity")
            .WithSummary("Gets the SHA-256, media type and size of the current version.");

        return group;
    }
}
