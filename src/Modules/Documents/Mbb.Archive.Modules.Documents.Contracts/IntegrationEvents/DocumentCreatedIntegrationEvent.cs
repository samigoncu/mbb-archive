using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentCreatedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    string Title,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.created.v1";
}
