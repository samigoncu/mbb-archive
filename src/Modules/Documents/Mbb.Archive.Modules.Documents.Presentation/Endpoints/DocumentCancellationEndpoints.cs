using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.Cancel;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;
internal static class DocumentCancellationEndpoints
{
    internal static void MapDocumentCancellation(this RouteGroupBuilder group)
    {
        group.MapPost("/{id:guid}/cancel", async (Guid id, ChangeDocumentCancellation request, DocumentCancellationHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, true, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.cancel").WithAccessAudit("access.document-cancelled.v1", "document", "id");
        group.MapPost("/{id:guid}/restore", async (Guid id, ChangeDocumentCancellation request, DocumentCancellationHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, false, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.cancel").WithAccessAudit("access.document-cancellation-restored.v1", "document", "id");
    }
}
