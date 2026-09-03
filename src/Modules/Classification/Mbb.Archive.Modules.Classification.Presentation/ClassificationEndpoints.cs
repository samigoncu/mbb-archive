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

namespace Mbb.Archive.Modules.Classification.Presentation;

public static class ClassificationEndpoints
{
 public static IEndpointRouteBuilder MapClassificationEndpoints(this IEndpointRouteBuilder endpoints)
 {
  var group=endpoints.MapGroup("/api/v1/classification").WithTags("Classification")
            .RequireAuthorization();
  group.MapGet("/file-plans",ListFilePlans);group.MapPost("/file-plans",CreateFilePlan);group.MapPost("/file-plans/{id:guid}/items",AddFilePlanItem);group.MapGet("/file-plans/{id:guid}",GetFilePlan);
  group.MapGet("/metadata-schemas",ListSchemas);group.MapPost("/metadata-schemas",CreateSchema);group.MapPost("/metadata-schemas/{id:guid}/fields",AddField);group.MapPost("/metadata-schemas/{id:guid}/publish",PublishSchema);group.MapGet("/metadata-schemas/{id:guid}",GetSchema);
  group.MapPost("/documents/{documentId:guid}/classifications",ClassifyDocument);group.MapPut("/documents/{documentId:guid}/metadata/{schemaId:guid}",SetMetadata);return endpoints;
 }
 private static async Task<IResult> ListFilePlans(int? page,int? pageSize,GetFilePlansQueryHandler h,CancellationToken ct){var result=await h.Handle(new(page??1,pageSize??PageRequest.DefaultPageSize),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}
 private static async Task<IResult> ListSchemas(int? page,int? pageSize,GetMetadataSchemasQueryHandler h,CancellationToken ct){var result=await h.Handle(new(page??1,pageSize??PageRequest.DefaultPageSize),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}
 private static async Task<IResult> CreateFilePlan(CreateFilePlanRequest r,CreateFilePlanCommandHandler h,CancellationToken ct){var result=await h.Handle(new(r.Code,r.Name,r.Version,r.Authority,r.EffectiveFrom,r.EffectiveTo),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Created($"/api/v1/classification/file-plans/{result.Value}",new{Id=result.Value});}
 private static async Task<IResult> AddFilePlanItem(Guid id,AddFilePlanItemRequest r,AddFilePlanItemCommandHandler h,CancellationToken ct){var result=await h.Handle(new(id,r.ParentId,r.Code,r.Title,r.Level,r.IsSelectable),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(new{Id=result.Value});}
 private static async Task<IResult> GetFilePlan(Guid id,GetFilePlanTreeQueryHandler h,CancellationToken ct){var result=await h.Handle(new(id),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}
 private static async Task<IResult> CreateSchema(CreateSchemaRequest r,CreateMetadataSchemaCommandHandler h,CancellationToken ct){var result=await h.Handle(new(r.Key,r.Name,r.Version),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Created($"/api/v1/classification/metadata-schemas/{result.Value}",new{Id=result.Value});}
 private static async Task<IResult> AddField(Guid id,AddFieldRequest r,AddMetadataFieldCommandHandler h,CancellationToken ct){var result=await h.Handle(new(id,r.Key,r.Label,r.FieldType,r.IsRequired,r.IsSearchable,r.IsRepeatable,r.OptionsJson),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(new{Id=result.Value});}
 private static async Task<IResult> PublishSchema(Guid id,PublishMetadataSchemaCommandHandler h,CancellationToken ct){var result=await h.Handle(new(id),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.NoContent();}
 private static async Task<IResult> GetSchema(Guid id,GetMetadataSchemaQueryHandler h,CancellationToken ct){var result=await h.Handle(new(id),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(result.Value);}
 private static async Task<IResult> ClassifyDocument(Guid documentId,ClassifyRequest r,ClassifyDocumentCommandHandler h,CancellationToken ct){var result=await h.Handle(new(documentId,r.FilePlanId,r.FilePlanItemId,r.IsPrimary),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(new{Id=result.Value});}
 private static async Task<IResult> SetMetadata(Guid documentId,Guid schemaId,Dictionary<string,JsonElement> values,SetDocumentMetadataCommandHandler h,CancellationToken ct){var result=await h.Handle(new(documentId,schemaId,values),ct);return result.IsFailure?ApiResults.Problem(result.Error):Results.Ok(new{Id=result.Value});}
 public sealed record CreateFilePlanRequest(string Code,string Name,string Version,string Authority,DateOnly EffectiveFrom,DateOnly? EffectiveTo);
 public sealed record AddFilePlanItemRequest(Guid? ParentId,string Code,string Title,int Level,bool IsSelectable);
 public sealed record CreateSchemaRequest(string Key,string Name,int Version);
 public sealed record AddFieldRequest(string Key,string Label,MetadataFieldType FieldType,bool IsRequired,bool IsSearchable,bool IsRepeatable,string? OptionsJson);
 public sealed record ClassifyRequest(Guid FilePlanId,Guid FilePlanItemId,bool IsPrimary);
}
