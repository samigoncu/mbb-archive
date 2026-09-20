using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Archive.Application.Records.Declare;
using Mbb.Archive.Modules.Archive.Application.Records.Get;
using Mbb.Archive.Modules.Archive.Application.Records.List;
namespace Mbb.Archive.Modules.Archive.Presentation;

public static class ArchiveEndpoints { public static IEndpointRouteBuilder MapArchiveEndpoints(this IEndpointRouteBuilder e) { var g = e.MapGroup("/api/v1/archive").WithTags("Archive").RequireAuthorization(); g.MapGet("/records", async (int? page, int? pageSize, string? status, Guid? documentId, GetArchiveRecordsQueryHandler h, CancellationToken ct) => { var r = await h.Handle(new GetArchiveRecordsQuery(page ?? 1, pageSize ?? 25, status, documentId), ct); return r.IsFailure ? ApiResults.Problem(r.Error) : Results.Ok(r.Value); }).RequireAuthorization("permission:archive.records.read"); g.MapGet("/records/{id:guid}", async (Guid id, GetArchiveRecordQueryHandler h, CancellationToken ct) => { var r = await h.Handle(new GetArchiveRecordQuery(id), ct); return r.IsFailure ? ApiResults.Problem(r.Error) : Results.Ok(r.Value); }).RequireAuthorization("permission:archive.records.read"); g.MapPost("/records/{id:guid}/declare", async (Guid id, DeclareRequest req, Mbb.Archive.BuildingBlocks.Application.Security.ICurrentUserPermissions user, DeclareArchiveRecordCommandHandler h, CancellationToken ct) => { var r = await h.Handle(new DeclareArchiveRecordCommand(id, req.ClassificationCode, req.RetentionRuleCode, user.Subject), ct); return r.IsFailure ? ApiResults.Problem(r.Error) : Results.NoContent(); }).RequireAuthorization("permission:archive.records.declare"); return e; } private sealed record DeclareRequest(string ClassificationCode, string RetentionRuleCode); }
