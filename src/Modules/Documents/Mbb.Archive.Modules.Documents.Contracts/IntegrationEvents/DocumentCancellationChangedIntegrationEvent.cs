using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentCancellationChangedIntegrationEvent(Guid EventId, Guid DocumentId, bool IsCancelled,
    string Reason, string Actor, Guid RequestId, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => IsCancelled ? "documents.cancelled.v1" : "documents.cancellation-restored.v1";
}
