using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IFileStagingService
{
    Task<StagedFileDescriptor> StageAsync(
        DocumentFileIngestionId ingestionId,
        Stream source,
        CancellationToken cancellationToken);

    Task<Stream> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken);

    Task DeleteIfExistsAsync(
        string storageKey,
        CancellationToken cancellationToken);
}

public sealed record StagedFileDescriptor(
    string StorageKey,
    string Sha256Hash,
    long SizeBytes);

public sealed class FileStagingRejectedException : Exception
{
    public FileStagingRejectedException(string message)
        : base(message)
    {
    }
}
