using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.AddField;
public sealed record AddMetadataFieldCommand(Guid SchemaId,string Key,string Label,MetadataFieldType FieldType,bool IsRequired,bool IsSearchable,bool IsRepeatable,string? OptionsJson) : ICommand<Guid>;
