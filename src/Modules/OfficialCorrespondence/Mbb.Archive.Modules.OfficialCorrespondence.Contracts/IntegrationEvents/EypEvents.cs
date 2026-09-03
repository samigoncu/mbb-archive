using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Contracts.IntegrationEvents;

public sealed record EypPackageInspectedIntegrationEvent(
    Guid EventId,
    Guid InspectionId,
    Guid? DocumentId,
    Guid? DocumentVersionId,
    string PackageSha256,
    string StructuralStatus,
    string OfficialValidationStatus,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "official-correspondence.eyp-inspected.v1";
}
