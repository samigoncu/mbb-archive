using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;

public sealed record DocumentClassifiedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    Guid FilePlanId,
    string FilePlanCode,
    string FilePlanName,
    Guid FilePlanItemId,
    string FilePlanItemCode,
    string FilePlanItemTitle,
    bool IsPrimary,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "classification.document-classified.v1";
}
