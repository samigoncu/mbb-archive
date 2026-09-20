using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.Documents.Application.Documents.Create;
using Mbb.Archive.Modules.Documents.Application.Documents.StageFile;
namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class DossierZipUploadEndpoint
{
    internal static void MapDossierZipUpload(this RouteGroupBuilder group)
    {
        group.MapPost("/dossiers/{id:guid}/zip", async (Guid id, HttpRequest request, HttpContext context,
            IDossierQueries queries, IArchiveUnitDirectory units, CreateDocumentCommandHandler create,
            StageDocumentFileCommandHandler stage, CancellationToken ct) =>
        {
            var dossier = await queries.GetAsync(id, ct);
            if (dossier is null || await units.ResolveWritableAsync(dossier.OwnerUnitId, "documents.manage.all", ct) is null) return Results.NotFound();
            IReadOnlyList<ZipImportFile> files;
            try { files = await ZipImportReader.ReadAsync(request.Body, ct); }
            catch (InvalidDataException ex) { return Results.BadRequest(new { detail = ex.Message }); }
            var results = new List<object>();
            var actor = context.User.FindFirst("sub")?.Value ?? context.User.Identity?.Name ?? "";
            foreach (var file in files)
            {
                var created = await create.Handle(new(file.Path, dossier.OwnerUnitId, id), ct);
                if (created.IsFailure) { results.Add(new { name = file.Path, success = false, message = created.Error.Description, documentId = (Guid?)null }); continue; }
                using var content = new MemoryStream(file.Content, false);
                var staged = await stage.Handle(new(created.Value.Id, file.FileName, file.ContentType, content.Length, content, actor, null), ct);
                results.Add(new { name = file.Path, success = staged.IsSuccess, message = staged.IsSuccess ? "Güvenlik taraması ve işleme kuyruğuna alındı." : staged.Error.Description, documentId = (Guid?)created.Value.Id });
            }
            return Results.Ok(results);
        }).RequireAuthorization("permission:documents.write").RequireRateLimiting("uploads")
            .WithAccessAudit("access.dossier-zip-imported.v1", "dossier", "id");
    }
}
