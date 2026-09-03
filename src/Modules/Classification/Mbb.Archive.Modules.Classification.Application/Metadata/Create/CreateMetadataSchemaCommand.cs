using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.Create;
public sealed record CreateMetadataSchemaCommand(string Key,string Name,int Version) : ICommand<Guid>;
