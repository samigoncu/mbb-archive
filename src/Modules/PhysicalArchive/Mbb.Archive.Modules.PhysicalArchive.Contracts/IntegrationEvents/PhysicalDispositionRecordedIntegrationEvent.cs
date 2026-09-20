using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;
public sealed record PhysicalDispositionRecordedIntegrationEvent(Guid EventId, Guid ProcessId, Guid DocumentId,
    IReadOnlyList<Guid> FolderIds, string Actor, string ProtocolReference, Guid EvidenceDocumentId,
    DateTimeOffset ExecutedAt, DateTimeOffset OccurredAt) : IIntegrationEvent
{ public string EventName => "physical-archive.disposition-recorded.v1"; }
