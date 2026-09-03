using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Archive.Contracts.IntegrationEvents;
public sealed record ArchiveRecordDeclaredIntegrationEvent(Guid EventId,Guid ArchiveRecordId,Guid DocumentId,Guid DocumentVersionId,string ClassificationCode,string RetentionRuleCode,string OriginalStorageKey,string Sha256Hash,DateTimeOffset DeclaredAt,DateTimeOffset OccurredAt):IIntegrationEvent{public string EventName=>"archive.record-declared.v1";}
