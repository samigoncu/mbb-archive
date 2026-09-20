using Mbb.Archive.Modules.Classification.Application.Metadata.List;
using Mbb.Archive.Modules.Classification.Application.FilePlans.List;
using Mbb.Archive.BuildingBlocks.Application;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Classification.Application.Documents.Classify;
using Mbb.Archive.Modules.Classification.Application.Documents.Metadata;
using Mbb.Archive.Modules.Classification.Application.FilePlans.AddItem;
using Mbb.Archive.Modules.Classification.Application.FilePlans.Create;
using Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
using Mbb.Archive.Modules.Classification.Application.Metadata.AddField;
using Mbb.Archive.Modules.Classification.Application.Metadata.Create;
using Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;
using Mbb.Archive.Modules.Classification.Application.Metadata.Publish;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

using Mbb.Archive.Modules.Classification.Application.FilePlans.Manage;
using Mbb.Archive.Modules.Classification.Application.Metadata.Manage;

namespace Mbb.Archive.Modules.Classification.Presentation;

public static class ClassificationEndpoints
{
  public static IEndpointRouteBuilder MapClassificationEndpoints(this IEndpointRouteBuilder endpoints)
  {
    var group = endpoints.MapGroup("/api/v1/classification").WithTags("Classification")
              .RequireAuthorization();
    group.MapGet("/file-plans", ListFilePlans).RequireAuthorization("permission:classification.read");
    group.MapPost("/file-plans", CreateFilePlan).RequireAuthorization("permission:classification.manage").WithAccessAudit("access.file-plan-created.v1", "file-plan");
    group.MapPost("/file-plans/{id:guid}/items", AddFilePlanItem).RequireAuthorization("permission:classification.manage").WithAccessAudit("access.file-plan-item-added.v1", "file-plan", "id");
    group.MapGet("/file-plans/{id:guid}", GetFilePlan).RequireAuthorization("permission:classification.read");
    // Dosya planı ve konu kodu düzeltme. Kod değiştirilemez: belgeler, dijital
    // dosyalar, fiziksel klasörler ve birim atamaları koda göre bağlanır.
    group.MapPut("/file-plans/{id:guid}", async (Guid id, RenamePlanRequest request, FilePlanManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new RenameFilePlanCommand(id, request.Name), ct)))
      .RequireAuthorization("permission:classification.manage")
      .WithAccessAudit("access.file-plan-renamed.v1", "file-plan", "id");

    group.MapPost("/file-plans/{id:guid}/active", async (Guid id, ActiveRequest request, FilePlanManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new SetFilePlanActiveCommand(id, request.IsActive), ct)))
      .RequireAuthorization("permission:classification.manage");

    group.MapPut("/file-plans/{id:guid}/items/{itemId:guid}", async (Guid id, Guid itemId, UpdateItemRequest request, FilePlanManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new UpdateFilePlanItemCommand(id, itemId, request.Title, request.Description, request.IsSelectable), ct)))
      .RequireAuthorization("permission:classification.manage")
      .WithAccessAudit("access.file-plan-item-updated.v1", "file-plan", "id");

    group.MapPost("/file-plans/{id:guid}/items/{itemId:guid}/active", async (Guid id, Guid itemId, ActiveRequest request, FilePlanManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new SetFilePlanItemActiveCommand(id, itemId, request.IsActive), ct)))
      .RequireAuthorization("permission:classification.manage")
      .WithAccessAudit("access.file-plan-item-activation-changed.v1", "file-plan", "id");

    group.MapDelete("/file-plans/{id:guid}/items/{itemId:guid}", async (Guid id, Guid itemId, FilePlanManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new DeleteFilePlanItemCommand(id, itemId), ct)))
      .RequireAuthorization("permission:classification.manage")
      .WithAccessAudit("access.file-plan-item-deleted.v1", "file-plan", "id");

    group.MapPost("/file-plans/{id:guid}/retire", async (Guid id, Mbb.Archive.Modules.Classification.Application.FilePlans.Retire.RetireFilePlanHandler handler, CancellationToken ct) =>
    {
      var result = await handler.Handle(id, ct);
      return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
    }).RequireAuthorization("permission:classification.manage").WithAccessAudit("access.file-plan-retired.v1", "file-plan", "id");
    group.MapGet("/metadata-schemas", ListSchemas).RequireAuthorization("permission:classification.read");
    group.MapPost("/metadata-schemas", CreateSchema).RequireAuthorization("permission:classification.manage");
    group.MapPost("/metadata-schemas/{id:guid}/fields", AddField).RequireAuthorization("permission:classification.manage");
    group.MapPost("/metadata-schemas/{id:guid}/publish", PublishSchema).RequireAuthorization("permission:classification.manage");
    group.MapGet("/metadata-schemas/{id:guid}", GetSchema).RequireAuthorization("permission:classification.read");
    // Üstveri şeması düzeltmeleri. Alan değişiklikleri yalnız taslak şemada.
    group.MapPut("/metadata-schemas/{id:guid}", async (Guid id, RenameSchemaRequest request, MetadataSchemaManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new RenameMetadataSchemaCommand(id, request.Name), ct)))
      .RequireAuthorization("permission:classification.manage");

    group.MapPut("/metadata-schemas/{id:guid}/fields/{fieldId:guid}", async (Guid id, Guid fieldId, UpdateFieldRequest request, MetadataSchemaManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new UpdateMetadataFieldCommand(id, fieldId, request.Label, request.FieldType,
          request.IsRequired, request.IsSearchable, request.IsRepeatable, request.OptionsJson), ct)))
      .RequireAuthorization("permission:classification.manage");

    group.MapDelete("/metadata-schemas/{id:guid}/fields/{fieldId:guid}", async (Guid id, Guid fieldId, MetadataSchemaManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new RemoveMetadataFieldCommand(id, fieldId), ct)))
      .RequireAuthorization("permission:classification.manage");

    group.MapDelete("/metadata-schemas/{id:guid}", async (Guid id, MetadataSchemaManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new DeleteMetadataSchemaCommand(id), ct)))
      .RequireAuthorization("permission:classification.manage")
      .WithAccessAudit("access.metadata-schema-deleted.v1", "metadata-schema", "id");

    group.MapPost("/metadata-schemas/{id:guid}/revert-to-draft", async (Guid id, MetadataSchemaManagementHandlers handler, CancellationToken ct)
      => Apply(await handler.Handle(new RevertMetadataSchemaToDraftCommand(id), ct)))
      .RequireAuthorization("permission:classification.manage");
    group.MapPost("/documents/{documentId:guid}/classifications", ClassifyDocument).RequireAuthorization("permission:documents.metadata.write");
    group.MapPut("/documents/{documentId:guid}/metadata/{schemaId:guid}", SetMetadata).RequireAuthorization("permission:documents.metadata.write"); return endpoints;
  }
  private static async Task<IResult> ListFilePlans(int? page, int? pageSize, GetFilePlansQueryHandler h, CancellationToken ct) { var result = await h.Handle(new(page ?? 1, pageSize ?? PageRequest.DefaultPageSize), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value); }
  private static async Task<IResult> ListSchemas(int? page, int? pageSize, GetMetadataSchemasQueryHandler h, CancellationToken ct) { var result = await h.Handle(new(page ?? 1, pageSize ?? PageRequest.DefaultPageSize), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value); }
  private static async Task<IResult> CreateFilePlan(CreateFilePlanRequest r, CreateFilePlanCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(r.Code, r.Name, r.Version, r.Authority, r.EffectiveFrom, r.EffectiveTo), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/classification/file-plans/{result.Value}", new { Id = result.Value }); }
  private static async Task<IResult> AddFilePlanItem(Guid id, AddFilePlanItemRequest r, AddFilePlanItemCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(id, r.ParentId, r.Code, r.Title, r.Level, r.IsSelectable, r.Description), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { Id = result.Value }); }
  private static async Task<IResult> GetFilePlan(Guid id, GetFilePlanTreeQueryHandler h, CancellationToken ct) { var result = await h.Handle(new(id), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value); }
  private static async Task<IResult> CreateSchema(CreateSchemaRequest r, CreateMetadataSchemaCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(r.Key, r.Name, r.Version), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Created($"/api/v1/classification/metadata-schemas/{result.Value}", new { Id = result.Value }); }
  private static async Task<IResult> AddField(Guid id, AddFieldRequest r, AddMetadataFieldCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(id, r.Key, r.Label, r.FieldType, r.IsRequired, r.IsSearchable, r.IsRepeatable, r.OptionsJson), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { Id = result.Value }); }
  private static async Task<IResult> PublishSchema(Guid id, PublishMetadataSchemaCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(id), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent(); }
  private static async Task<IResult> GetSchema(Guid id, GetMetadataSchemaQueryHandler h, CancellationToken ct) { var result = await h.Handle(new(id), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value); }
  private static async Task<IResult> ClassifyDocument(Guid documentId, ClassifyRequest r, ClassifyDocumentCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(documentId, r.FilePlanId, r.FilePlanItemId, r.IsPrimary), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { Id = result.Value }); }
  private static async Task<IResult> SetMetadata(Guid documentId, Guid schemaId, Dictionary<string, JsonElement> values, SetDocumentMetadataCommandHandler h, CancellationToken ct) { var result = await h.Handle(new(documentId, schemaId, values), ct); return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { Id = result.Value }); }
  public sealed record CreateFilePlanRequest(string Code, string Name, string Version, string Authority, DateOnly EffectiveFrom, DateOnly? EffectiveTo);
  public sealed record AddFilePlanItemRequest(Guid? ParentId, string Code, string Title, int Level, bool IsSelectable, string? Description = null);
  public sealed record CreateSchemaRequest(string Key, string Name, int Version);
  public sealed record AddFieldRequest(string Key, string Label, MetadataFieldType FieldType, bool IsRequired, bool IsSearchable, bool IsRepeatable, string? OptionsJson);
  public sealed record ClassifyRequest(Guid FilePlanId, Guid FilePlanItemId, bool IsPrimary);
  private sealed record RenamePlanRequest(string Name);
  private sealed record ActiveRequest(bool IsActive);
  private sealed record UpdateItemRequest(string Title, string? Description, bool IsSelectable);
  /// <summary>Başarıda gövdesiz yanıt, hatada ProblemDetails.</summary>
  private static IResult Apply(Result result)
   => result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
  private sealed record RenameSchemaRequest(string Name);
  private sealed record UpdateFieldRequest(string Label, string FieldType, bool IsRequired, bool IsSearchable, bool IsRepeatable, string? OptionsJson);
}
