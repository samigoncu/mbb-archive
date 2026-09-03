namespace Mbb.Archive.Modules.Processing.Contracts.Models;

public sealed record ProcessingArtifactDescriptor(
    string ArtifactType,
    string StorageKey,
    string MimeType,
    string Sha256Hash,
    long SizeBytes);
