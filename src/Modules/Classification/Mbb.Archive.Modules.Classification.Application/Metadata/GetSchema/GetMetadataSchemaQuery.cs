using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;
public sealed record GetMetadataSchemaQuery(Guid Id) : IQuery<MetadataSchemaDetails>;
public sealed record MetadataSchemaDetails(Guid Id,string Key,string Name,int Version,string Status,DateTimeOffset CreatedAt,DateTimeOffset? PublishedAt,IReadOnlyList<MetadataFieldDetails> Fields);
public sealed record MetadataFieldDetails(Guid Id,string Key,string Label,string FieldType,bool IsRequired,bool IsSearchable,bool IsRepeatable,string? OptionsJson);
