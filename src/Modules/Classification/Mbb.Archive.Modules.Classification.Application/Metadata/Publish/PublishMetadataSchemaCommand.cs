using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.Publish;
public sealed record PublishMetadataSchemaCommand(Guid SchemaId) : ICommand;
