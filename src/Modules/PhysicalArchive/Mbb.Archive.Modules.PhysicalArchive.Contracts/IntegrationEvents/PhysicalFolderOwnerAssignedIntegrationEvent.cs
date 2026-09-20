using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;
public sealed record PhysicalFolderOwnerAssignedIntegrationEvent(Guid EventId, Guid FolderId,
    Guid OwnerUnitId, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "physical-archive.folder-owner-assigned.v1";
}
