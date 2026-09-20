using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
public sealed record DossierFiledIntegrationEvent(Guid EventId, Guid DossierId, Guid? DocumentId,
    Guid OwnerUnitId, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.dossier-filed.v1";
}
