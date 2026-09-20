using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Application.Queries;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Presentation;

public static class PhysicalArchiveEndpoints
{
    public static IEndpointRouteBuilder MapPhysicalArchiveEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/physical-archive")
            .WithTags("Physical Archive")
            .RequireAuthorization();

        group.MapGet("/borrowers", async (string? q, int? page,
            ILoanBorrowerDirectory directory, CancellationToken ct) =>
        {
            if (q?.Length > 100 || page is <= 0) return Results.BadRequest(new { message = "Geçersiz arama veya sayfa." });
            return Results.Ok(await directory.SearchAsync(q?.Trim() ?? "", new PageRequest(page ?? 1, 25), ct));
        }).RequireAuthorization("permission:physical-archive.loan");

        // Yerleşim seviyesi kataloğu: bina, oda, dolap, raf… kurum ekleyebilir.
        group.MapGet("/locations/types", async (PhysicalArchiveQueryHandlers handler, CancellationToken ct)
            => FromResult(await handler.Handle(new GetLocationTypesQuery(), ct)))
            .RequireAuthorization("permission:physical-archive.read");

        group.MapPost("/locations/types", async (LocationTypeRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => Created(await handler.Handle(new CreateLocationTypeCommand(
                request.Code, request.Name, request.Level, request.CanStoreFolder, request.AllowsCapacity), ct),
                "/api/v1/physical-archive/locations/types"))
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapPut("/locations/types/{code}", async (string code, LocationTypeRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new UpdateLocationTypeCommand(
                code, request.Name, request.Level, request.CanStoreFolder, request.AllowsCapacity), ct)))
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapPost("/locations/types/{code}/active", async (string code, SetActiveRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new SetLocationTypeActiveCommand(code, request.IsActive), ct)))
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapDelete("/locations/types/{code}", async (string code, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new DeleteLocationTypeCommand(code), ct)))
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapPost("/locations/root", CreateRoot)
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapPost("/locations/{parentId:guid}/children", CreateChild)
            .RequireAuthorization("permission:physical-archive.manage");

        group.MapPut("/locations/{id:guid}", async (Guid id, UpdateLocationRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new UpdateLocationCommand(id, request.Code, request.Name, request.Barcode, request.Capacity), ct)))
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.location-updated.v1", "location", "id");

        group.MapPost("/locations/{id:guid}/active", async (Guid id, SetActiveRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new SetLocationActiveCommand(id, request.IsActive), ct)))
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.location-activation-changed.v1", "location", "id");

        group.MapDelete("/locations/{id:guid}", async (Guid id, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.Handle(new DeleteLocationCommand(id), ct)))
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.location-deleted.v1", "location", "id");

        group.MapGet("/locations", ListLocations)
            .RequireAuthorization("permission:physical-archive.read");

        group.MapGet("/locations/occupancy", LocationOccupancy)
            .RequireAuthorization("permission:physical-archive.read");

        group.MapGet("/folders", ListFolders)
            .RequireAuthorization("permission:physical-archive.read");

        group.MapPost("/folders", RegisterFolder)
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.folder-created.v1", "folder");

        group.MapPost("/folders/{id:guid}/owner", async (Guid id, OwnerRequest request, PhysicalArchiveCommandHandlers handler, CancellationToken ct)
            => NoContent(await handler.AssignLegacyOwnerAsync(id, request.OwnerUnitId, ct)))
            .RequireAuthorization("permission:physical-archive.manage");
        group.MapGet("/folders/{id:guid}", GetFolder)
            .RequireAuthorization("permission:physical-archive.read")
            .WithAccessAudit("access.folder-viewed.v1", "folder", "id");

        group.MapGet("/folders/by-barcode/{barcode}", FindFolder)
            .RequireAuthorization("permission:physical-archive.read")
            .WithAccessAudit("access.folder-viewed.v1", "folder");

        group.MapPost("/folders/{id:guid}/documents", LinkDocument)
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.folder-document-added.v1", "folder", "id");

        group.MapPost("/folders/{id:guid}/move", MoveFolder)
            .RequireAuthorization("permission:physical-archive.manage")
            .WithAccessAudit("access.folder-moved.v1", "folder", "id");

        group.MapPost("/folders/{id:guid}/checkout", Checkout)
            .RequireAuthorization("permission:physical-archive.loan")
            .WithAccessAudit("access.folder-checked-out.v1", "folder", "id");

        group.MapPost("/loans/{id:guid}/return", Return)
            .RequireAuthorization("permission:physical-archive.loan");

        group.MapGet("/loans", ListLoans)
            .RequireAuthorization("permission:physical-archive.read");

        group.MapGet("/loans/overdue", Overdue)
            .RequireAuthorization("permission:physical-archive.read");

        return endpoints;
    }

    private static async Task<IResult> CreateRoot(
        RootRequest request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => Created(await handler.Handle(
            new CreateRootLocationCommand(request.Code, request.Name, request.Barcode, request.TypeCode), ct),
            "/api/v1/physical-archive/locations");

    private static async Task<IResult> CreateChild(
        Guid parentId,
        ChildRequest request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => Created(await handler.Handle(
            new CreateChildLocationCommand(
                parentId,
                request.TypeCode,
                request.Code,
                request.Name,
                request.Barcode,
                request.Capacity), ct),
            "/api/v1/physical-archive/locations");

    private static async Task<IResult> ListLocations(
        string? type,
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetLocationTreeQuery(type), ct);
        return Results.Ok(result.Value);
    }

    private static async Task<IResult> LocationOccupancy(
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetLocationOccupancyQuery(), ct);
        return Results.Ok(result.Value);
    }

    private static async Task<IResult> ListFolders(
        int? page,
        int? pageSize,
        string? barcode,
        string? title,
        string? filePlanCode,
        Guid? locationId,
        string? status,
        int? year,
        Guid? containsDocumentId, Guid? ownerUnitId, Guid? digitalDossierId,
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
        => FromResult(
            await handler.Handle(
                new GetPhysicalFoldersQuery(
                    page ?? 1,
                    pageSize ?? PageRequest.DefaultPageSize,
                    new FolderFilter(barcode, title, filePlanCode, locationId, status, year, containsDocumentId, ownerUnitId, digitalDossierId)),
                ct));

    private static async Task<IResult> RegisterFolder(
        RegisterPhysicalFolderCommand command,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => Created(await handler.Handle(command, ct), "/api/v1/physical-archive/folders");

    private static async Task<IResult> GetFolder(
        Guid id,
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
        => FromResult(await handler.Handle(new GetPhysicalFolderQuery(id), ct));

    private static async Task<IResult> FindFolder(
        string barcode,
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
        => FromResult(await handler.Handle(new FindPhysicalFolderByBarcodeQuery(barcode), ct));

    private static async Task<IResult> LinkDocument(
        Guid id,
        LinkRequest request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(
            new LinkDocumentToFolderCommand(id, request.DocumentId), ct));

    private static async Task<IResult> MoveFolder(
        Guid id,
        MoveRequest request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(
            new MovePhysicalFolderCommand(id, request.DestinationLocationId), ct));

    private static async Task<IResult> Checkout(
        Guid id,
        CheckoutRequest request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => Created(await handler.Handle(
            new CheckoutPhysicalFolderCommand(
                id,
                request.BorrowerSubjectId,
                request.Purpose,
                request.DueAt,
                request.CheckedOutBy), ct),
            "/api/v1/physical-archive/loans");

    private static async Task<IResult> Return(
        Guid id,
        ReturnRequest? request,
        PhysicalArchiveCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new ReturnPhysicalFolderCommand(id, request?.ReturnNote), ct));

    private static async Task<IResult> ListLoans(
        int? page,
        int? pageSize,
        string? status,
        Guid? folderId,
        string? borrowerSubjectId,
        bool? overdueOnly,
        int? dueInDays,
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
        => FromResult(
            await handler.Handle(
                new GetPhysicalLoansQuery(
                    page ?? 1,
                    pageSize ?? PageRequest.DefaultPageSize,
                    new LoanFilter(status, folderId, borrowerSubjectId, overdueOnly ?? false, dueInDays)),
                ct));

    private static async Task<IResult> Overdue(
        PhysicalArchiveQueryHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetOverduePhysicalLoansQuery(), ct);
        return Results.Ok(result.Value);
    }

    private static IResult Created(Result<Guid> result, string basePath)
        => result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created($"{basePath}/{result.Value}", new { id = result.Value });

    private static IResult FromResult<T>(Result<T> result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);

    private static IResult NoContent(Result result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();

    private sealed record UpdateLocationRequest(string Code, string Name, string Barcode, int? Capacity);
    private sealed record SetActiveRequest(bool IsActive);
    private sealed record LocationTypeRequest(string Code, string Name, int Level, bool CanStoreFolder, bool AllowsCapacity);

    private sealed record RootRequest(string Code, string Name, string Barcode, string? TypeCode = null);
    private sealed record ChildRequest(
        string TypeCode,
        string Code,
        string Name,
        string Barcode,
        int? Capacity);
    private sealed record OwnerRequest(Guid OwnerUnitId);
    private sealed record LinkRequest(Guid DocumentId);
    private sealed record MoveRequest(Guid DestinationLocationId);
    private sealed record CheckoutRequest(
        string BorrowerSubjectId,
        string Purpose,
        DateTimeOffset DueAt,
        string? CheckedOutBy = null);
    private sealed record ReturnRequest(string? ReturnNote);
}
