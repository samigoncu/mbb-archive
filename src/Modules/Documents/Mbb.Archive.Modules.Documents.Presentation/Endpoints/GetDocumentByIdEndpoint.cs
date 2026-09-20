using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentByIdEndpoint
{
    internal static RouteGroupBuilder MapGetDocumentById(this RouteGroupBuilder group)
    {
        group.MapGet(
                "/{id:guid}",
                async (
                    Guid id,
                    GetDocumentByIdQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentByIdQuery(id),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .RequireAuthorization("permission:documents.read")
            .WithAccessAudit("access.document-viewed.v1", "document", "id")
            .WithName("GetDocumentById")
            .WithSummary("Gets a document by id.");

        return group;
    }
}
