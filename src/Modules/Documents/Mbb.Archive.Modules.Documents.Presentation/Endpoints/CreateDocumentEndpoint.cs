using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.Create;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class CreateDocumentEndpoint
{
    internal static RouteGroupBuilder MapCreateDocument(this RouteGroupBuilder group)
    {
        group.MapPost(
                "/",
                async (
                    CreateDocumentRequest request,
                    CreateDocumentCommandHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new CreateDocumentCommand(request.Title),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Created(
                            $"/api/v1/documents/{result.Value.Id}",
                            result.Value);
                })
            .WithName("CreateDocument")
            .WithSummary("Creates a document metadata record.");

        return group;
    }

    internal sealed record CreateDocumentRequest(string Title);
}
