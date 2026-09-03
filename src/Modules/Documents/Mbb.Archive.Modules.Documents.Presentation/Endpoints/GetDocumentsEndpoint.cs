using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentsEndpoint
{
    internal static RouteGroupBuilder MapGetDocuments(this RouteGroupBuilder group)
    {
        group.MapGet(
                "/",
                async (
                    int? page,
                    int? pageSize,
                    GetDocumentsQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentsQuery(
                            page ?? 1,
                            pageSize ?? 25),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .WithName("GetDocuments")
            .WithSummary("Gets a paginated document read model.");

        return group;
    }
}
