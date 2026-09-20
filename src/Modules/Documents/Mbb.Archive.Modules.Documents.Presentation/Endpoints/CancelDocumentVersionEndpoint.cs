using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.CancelVersion;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class CancelDocumentVersionEndpoint
{
    internal static void MapCancelDocumentVersion(this RouteGroupBuilder group) => group.MapPost(
        "/{id:guid}/versions/{number:int}/cancel", async (Guid id, int number, CancelDocumentVersion request,
            CancelDocumentVersionHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, number, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.versions.cancel")
        .WithAccessAudit("access.document-version-cancelled.v1", "document", "id")
        .WithName("CancelDocumentVersion");
}
