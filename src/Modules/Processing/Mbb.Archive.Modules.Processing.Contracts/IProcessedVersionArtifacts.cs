namespace Mbb.Archive.Modules.Processing.Contracts;
public interface IProcessedVersionArtifacts
{
    Task<ProcessedVersionArtifacts?> GetAsync(Guid documentId, Guid versionId, CancellationToken ct);
}
public sealed record ProcessedVersionArtifacts(string? TextKey, string? OcrKey);
