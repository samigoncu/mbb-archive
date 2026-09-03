using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentIngestionEndpoint
{
    internal static RouteGroupBuilder MapGetDocumentIngestion(
        this RouteGroupBuilder group)
    {
        group.MapGet(
                "/{documentId:guid}/ingestions/{ingestionId:guid}",
                async (
                    Guid documentId,
                    Guid ingestionId,
                    GetDocumentIngestionQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentIngestionQuery(documentId, ingestionId),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .WithName("GetDocumentIngestion")
            .WithSummary("Gets the current state of a document ingestion.");

        return group;
    }
}
