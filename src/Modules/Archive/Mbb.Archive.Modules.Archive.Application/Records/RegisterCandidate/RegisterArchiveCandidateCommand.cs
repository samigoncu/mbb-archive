using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Archive.Application.Records.RegisterCandidate;
public sealed record RegisterArchiveCandidateCommand(Guid MessageId,string EventName,Guid DocumentId,Guid DocumentVersionId,string OriginalStorageKey,string Sha256Hash,long SizeBytes,string MimeType,DateTimeOffset OccurredAt):ICommand<Guid>;
