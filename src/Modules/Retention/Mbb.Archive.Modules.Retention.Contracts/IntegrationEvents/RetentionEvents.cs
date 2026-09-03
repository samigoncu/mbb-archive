using Mbb.Archive.BuildingBlocks.Application;namespace Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;
public sealed record LegalHoldPlacedIntegrationEvent(Guid EventId,Guid RetentionCaseId,Guid ArchiveRecordId,string Reason,DateTimeOffset OccurredAt):IIntegrationEvent{public string EventName=>"retention.legal-hold-placed.v1";}
public sealed record LegalHoldReleasedIntegrationEvent(Guid EventId,Guid RetentionCaseId,Guid ArchiveRecordId,DateTimeOffset OccurredAt):IIntegrationEvent{public string EventName=>"retention.legal-hold-released.v1";}
public sealed record RetentionCaseEligibleIntegrationEvent(Guid EventId,Guid RetentionCaseId,Guid ArchiveRecordId,string DispositionAction,DateTimeOffset OccurredAt):IIntegrationEvent{public string EventName=>"retention.case-eligible.v1";}
