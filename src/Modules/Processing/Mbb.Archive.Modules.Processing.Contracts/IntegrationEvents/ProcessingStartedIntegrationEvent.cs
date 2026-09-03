using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;

public sealed record ProcessingStartedIntegrationEvent(
    Guid EventId,
    Guid ProcessingJobId,
    Guid DocumentId,
    Guid DocumentVersionId,
    string Stage,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "processing.started.v1";
}
