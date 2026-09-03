using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Contracts.IntegrationEvents;

public sealed record SearchDocumentIndexedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    Guid? DocumentVersionId,
    long ProjectionRevision,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "search.document-indexed.v1";
}
