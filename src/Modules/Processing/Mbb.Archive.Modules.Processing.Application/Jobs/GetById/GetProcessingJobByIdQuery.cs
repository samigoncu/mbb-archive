using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.GetById;
public sealed record GetProcessingJobByIdQuery(Guid Id) : IQuery<ProcessingJobDetails>;
public sealed record ProcessingArtifactDetails(Guid Id,string Type,string StorageKey,string MimeType,string Sha256Hash,long SizeBytes,DateTimeOffset CreatedAt);
public sealed record ProcessingJobDetails(Guid Id,Guid DocumentId,Guid DocumentVersionId,string OriginalStorageKey,string Sha256Hash,string MimeType,string Stage,DateTimeOffset CreatedAt,DateTimeOffset? StartedAt,string? FailureCode,string? FailureDetail,int? PdfPageCount,string? PdfVersion,bool? PdfHasEmbeddedText,double? OcrAverageConfidence,int? OcrPageCount,string? OcrEngine,string? OcrLanguages,IReadOnlyList<ProcessingArtifactDetails> Artifacts);
