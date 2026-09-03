using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Application.Projection;

public sealed record ApplyMetadataCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    string SchemaKey,
    string SchemaName,
    int SchemaVersion,
    string ValuesJson,
    DateTimeOffset OccurredAt) : ICommand;
