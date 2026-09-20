using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Collections.Application.Collections;

namespace Mbb.Archive.Modules.Collections.Presentation;

public static class CollectionsEndpoints
{
    public static IEndpointRouteBuilder MapCollectionsEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/collections")
            .WithTags("Collections")
            .RequireAuthorization();

        group.MapGet("/", GetCollections)
            .RequireAuthorization("permission:collections.read");

        group.MapGet("/{id:guid}", GetCollection)
            .RequireAuthorization("permission:collections.read")
            .WithAccessAudit("access.collection-viewed.v1", "collection", "id");

        group.MapGet("/by-document/{documentId:guid}", GetForDocument)
            .RequireAuthorization("permission:collections.read");

        group.MapPost("/", Create)
            .RequireAuthorization("permission:collections.manage")
            .WithAccessAudit("access.collection-created.v1", "collection", "id");

        group.MapPut("/{id:guid}", Rename)
            .RequireAuthorization("permission:collections.manage")
            .WithAccessAudit("access.collection-changed.v1", "collection", "id");

        group.MapDelete("/{id:guid}", Delete)
            .RequireAuthorization("permission:collections.manage")
            .WithAccessAudit("access.collection-deleted.v1", "collection", "id");

        group.MapPost("/{id:guid}/documents", AddDocument)
            .RequireAuthorization("permission:collections.manage")
            .WithAccessAudit("access.collection-document-added.v1", "collection", "id");

        group.MapDelete("/{id:guid}/documents/{documentId:guid}", RemoveDocument)
            .RequireAuthorization("permission:collections.manage")
            .WithAccessAudit("access.collection-document-removed.v1", "collection", "id");

        return endpoints;
    }

    private static async Task<IResult> GetCollections(
        int? page,
        int? pageSize,
        CollectionQueryHandlers handler,
        CancellationToken ct)
        => Ok(
            await handler.Handle(
                new GetCollectionsQuery(page ?? 1, pageSize ?? 50),
                ct));

    private static async Task<IResult> GetCollection(
        Guid id,
        CollectionQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetCollectionQuery(id), ct));

    private static async Task<IResult> GetForDocument(
        Guid documentId,
        CollectionQueryHandlers handler,
        CancellationToken ct)
        => Ok(await handler.Handle(new GetDocumentCollectionsQuery(documentId), ct));

    private static async Task<IResult> Create(
        CreateRequest request,
        CollectionCommandHandlers handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new CreateCollectionCommand(
                request.Name,
                request.Description,
                request.IsShared),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Created(
                $"/api/v1/collections/{result.Value}",
                new { id = result.Value });
    }

    private static async Task<IResult> Rename(
        Guid id,
        RenameRequest request,
        CollectionCommandHandlers handler,
        CancellationToken ct)
        => NoContent(
            await handler.Handle(
                new RenameCollectionCommand(
                    id,
                    request.Name,
                    request.Description,
                    request.IsShared),
                ct));

    private static async Task<IResult> Delete(
        Guid id,
        CollectionCommandHandlers handler,
        CancellationToken ct)
        => NoContent(await handler.Handle(new DeleteCollectionCommand(id), ct));

    private static async Task<IResult> AddDocument(
        Guid id,
        AddDocumentRequest request,
        CollectionCommandHandlers handler,
        CancellationToken ct)
        => NoContent(
            await handler.Handle(
                new AddDocumentToCollectionCommand(id, request.DocumentId),
                ct));

    private static async Task<IResult> RemoveDocument(
        Guid id,
        Guid documentId,
        CollectionCommandHandlers handler,
        CancellationToken ct)
        => NoContent(
            await handler.Handle(
                new RemoveDocumentFromCollectionCommand(id, documentId),
                ct));

    private static IResult Ok<T>(Result<T> result)
        => result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Ok(result.Value);

    private static IResult NoContent(Result result)
        => result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();

    private sealed record CreateRequest(
        string Name,
        string? Description,
        bool IsShared);

    private sealed record RenameRequest(
        string Name,
        string? Description,
        bool IsShared);

    private sealed record AddDocumentRequest(Guid DocumentId);
}
