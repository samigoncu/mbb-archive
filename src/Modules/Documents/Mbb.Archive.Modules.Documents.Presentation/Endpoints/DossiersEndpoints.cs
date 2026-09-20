using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;
internal static class DossiersEndpoints
{
    internal static void MapDossiers(this RouteGroupBuilder group)
    {
        group.MapGet("/{id:guid}/filing", async (Guid id, DocumentFilingHandler handler, CancellationToken ct) =>
        {
            var result = await handler.GetAsync(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:documents.write");
        group.MapPut("/{id:guid}/filing", async (Guid id, ChangeDocumentFiling request, DocumentFilingHandler handler, CancellationToken ct) =>
        {
            var result = await handler.ChangeAsync(id, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.write", "permission:documents.metadata.write")
            .WithAccessAudit("access.document-filing-changed.v1", "document", "id");
        group.MapGet("/dossiers", async (int? page, int? pageSize, Guid? ownerUnitId, string? filePlanCode,
            int? year, string? search, string? sort, IDossierQueries queries, CancellationToken ct) =>
        {
            var p = PageRequest.Create(page ?? 1, pageSize ?? 25);
            return p.IsFailure ? ApiResults.Problem(p.Error) : Results.Ok(await queries.ListAsync(p.Value, new(ownerUnitId, filePlanCode, year, search, sort), ct));
        }).RequireAuthorization("permission:documents.read");
        group.MapGet("/dossiers/{id:guid}", async (Guid id, IDossierQueries queries, CancellationToken ct) =>
        {
            var dossier = await queries.GetAsync(id, ct);
            return dossier is null ? Results.NotFound() : Results.Ok(dossier);
        }).RequireAuthorization("permission:documents.read")
            .WithAccessAudit("access.dossier-viewed.v1", "dossier", "id");
        group.MapPut("/dossiers/{id:guid}", async (Guid id, RenameDossierRequest request, DossierHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.RenameAsync(id, request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.write")
            .WithAccessAudit("access.dossier-renamed.v1", "dossier", "id");
        group.MapDossierZipUpload();
        group.MapPost("/dossiers", async (CreateDossierRequest request, DossierHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.CreateAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/documents/dossiers/{result.Value}", new { id = result.Value });
        }).RequireAuthorization("permission:documents.write")
            .WithAccessAudit("access.dossier-created.v1", "dossier");
        group.MapPost("/dossiers/{id:guid}/documents", async (Guid id, FileRequest request, DossierHandlers handler, CancellationToken ct) =>
        {
            var result = await handler.FileAsync(id, request.DocumentId, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:documents.write")
            .WithAccessAudit("access.dossier-document-added.v1", "dossier", "id");
    }
    private sealed record FileRequest(Guid DocumentId);
}
