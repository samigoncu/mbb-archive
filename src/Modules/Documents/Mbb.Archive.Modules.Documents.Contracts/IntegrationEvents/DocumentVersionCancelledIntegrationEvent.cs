using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentVersionCancelledIntegrationEvent(Guid EventId, Guid DocumentId, int VersionNumber,
    int? PreviousCurrentVersion, int? CurrentVersion, string Sha256Hash, string Reason, string Actor,
    Guid RequestId, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.version-cancelled.v1";
}
