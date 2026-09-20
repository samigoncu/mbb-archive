using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetOutboxStatusEndpoint
{
    internal static RouteGroupBuilder MapGetOutboxStatus(
        this RouteGroupBuilder group)
    {
        group.MapGet(
                "/outbox",
                async (
                    GetOutboxStatusQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetOutboxStatusQuery(),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .RequireAuthorization("permission:documents.operations.read")
            .WithName("GetDocumentsOutboxStatus")
            .WithSummary("Gets Documents transactional Outbox operational status.");

        return group;
    }
}
