using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Relations;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;
internal static class DocumentRelationsEndpoints
{
    public static void MapDocumentRelations(this RouteGroupBuilder group)
    {
        group.MapGet("/{id:guid}/relations", async (Guid id, DocumentRelationsHandler handler, CancellationToken ct) =>
        { var result = await handler.List(id, ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value); })
            .RequireAuthorization("permission:documents.read");
        group.MapPost("/{id:guid}/relations", async (Guid id, ChangeRelation request, DocumentRelationsHandler handler, CancellationToken ct) =>
        { var result = await handler.Create(id, request, ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/documents/{id}/relations/{result.Value}", new { id = result.Value }); })
            .RequireAuthorization("permission:documents.write").WithAccessAudit("access.document-relation-created.v1", "document", "id");
        group.MapPut("/{id:guid}/relations/{relationId:guid}", async (Guid id, Guid relationId, ChangeRelation request, DocumentRelationsHandler handler, CancellationToken ct) =>
        { var result = await handler.Update(id, relationId, request, ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent(); })
            .RequireAuthorization("permission:documents.write").WithAccessAudit("access.document-relation-updated.v1", "document", "id");
        group.MapPost("/{id:guid}/relations/{relationId:guid}/remove", async (Guid id, Guid relationId, RemoveRequest request, DocumentRelationsHandler handler, CancellationToken ct) =>
        { var result = await handler.Remove(id, relationId, request.ExpectedVersion, request.Reason, ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent(); })
            .RequireAuthorization("permission:documents.write").WithAccessAudit("access.document-relation-removed.v1", "document", "id");
    }
    private sealed record RemoveRequest(long ExpectedVersion, string Reason);
}
