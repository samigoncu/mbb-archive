using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;

public sealed record DocumentMetadataChangedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    Guid SchemaId,
    string SchemaKey,
    string SchemaName,
    int SchemaVersion,
    string ValuesJson,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "classification.document-metadata-changed.v1";
}
