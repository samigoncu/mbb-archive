using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Contracts.Models;

namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;

public sealed record ApplyTextExtractionResultCommand(
    Guid MessageId,
    string EventName,
    Guid ProcessingJobId,
    string Engine,
    string EngineVersion,
    int PageCount,
    int CharacterCount,
    ProcessingArtifactDescriptor TextArtifact,
    DateTimeOffset OccurredAt,
    ProcessingArtifactDescriptor? PdfArtifact = null,
    ProcessingArtifactDescriptor? JsonArtifact = null,
    double? AverageConfidence = null,
    string? Languages = null) : ICommand;
