namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IOriginalObjectStorage
{
    Task<StoredOriginalDescriptor> StoreAsync(
        string sha256Hash,
        string mimeType,
        long expectedSizeBytes,
        Stream content,
        CancellationToken cancellationToken);

    /// <summary>Nesneyi okuma için açar; yoksa null döner. Çağıran stream'i dispose eder.</summary>
    Task<Stream?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken);

    Task<Stream?> OpenReadVersionAsync(string storageKey, string? storageVersionId, CancellationToken cancellationToken)
        => storageVersionId is null ? OpenReadAsync(storageKey, cancellationToken)
            : throw new NotSupportedException("The storage provider cannot read a pinned object version.");

    Task<ObjectFixityResult> VerifyAsync(
        string storageKey,
        string expectedSha256Hash,
        long expectedSizeBytes,
        CancellationToken cancellationToken);
}

public sealed record StoredOriginalDescriptor(
    string StorageKey,
    long SizeBytes,
    string Sha256Hash,
    string? StorageVersionId = null);

public sealed record ObjectFixityResult(
    bool Exists,
    bool SizeMatches,
    bool HashMatches,
    long ActualSizeBytes,
    string? ActualSha256Hash,
    string? Error);
