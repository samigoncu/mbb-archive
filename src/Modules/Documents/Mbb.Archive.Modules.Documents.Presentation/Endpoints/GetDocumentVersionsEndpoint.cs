using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentVersionsEndpoint
{
    internal static RouteGroupBuilder MapGetDocumentVersions(
        this RouteGroupBuilder group)
    {
        group.MapGet(
                "/{id:guid}/versions",
                async (
                    Guid id,
                    GetDocumentVersionsQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentVersionsQuery(id),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .RequireAuthorization("permission:documents.read")
            .WithName("GetDocumentVersions")
            .WithSummary("Lists immutable versions of a document, newest first.");

        return group;
    }
}
