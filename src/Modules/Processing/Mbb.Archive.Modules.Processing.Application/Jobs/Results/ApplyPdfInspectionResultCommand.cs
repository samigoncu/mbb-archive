using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed record ApplyPdfInspectionResultCommand(Guid MessageId, string EventName, Guid ProcessingJobId, int PageCount, string PdfVersion, bool IsEncrypted, bool HasEmbeddedText, bool RequiresOcr, string Engine, string EngineVersion, ProcessingArtifactDescriptor? TextArtifact, ProcessingArtifactDescriptor? JsonArtifact, DateTimeOffset OccurredAt) : ICommand;
