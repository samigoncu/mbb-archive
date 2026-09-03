using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Evidence.Contracts.IntegrationEvents;

public sealed record EvidenceValidationCompletedIntegrationEvent(
    Guid EventId,
    Guid ValidationId,
    Guid? DocumentId,
    Guid? DocumentVersionId,
    string Kind,
    string Status,
    string Provider,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "evidence.validation-completed.v1";
}
