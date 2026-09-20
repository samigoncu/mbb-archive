using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
public sealed record UploadPolicyChangedIntegrationEvent(Guid EventId, int PreviousMaxFileSizeMb,
    int MaxFileSizeMb, string Actor, long Version, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.upload-policy-changed.v1";
}
