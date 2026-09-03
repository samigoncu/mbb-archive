using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.Documents.Metadata;
public sealed record SetDocumentMetadataCommand(Guid DocumentId,Guid SchemaId,IReadOnlyDictionary<string,JsonElement> Values) : ICommand<Guid>;
