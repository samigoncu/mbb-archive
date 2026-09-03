using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed record ApplyOcrResultCommand(Guid MessageId, string EventName, Guid ProcessingJobId, string Engine, string EngineVersion, string Languages, int PageCount, double AverageConfidence, ProcessingArtifactDescriptor TextArtifact, ProcessingArtifactDescriptor JsonArtifact, ProcessingArtifactDescriptor? SearchablePdfArtifact, DateTimeOffset OccurredAt) : ICommand;
