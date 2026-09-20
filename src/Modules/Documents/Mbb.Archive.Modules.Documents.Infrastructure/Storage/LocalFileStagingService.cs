using System.Buffers;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

/// <summary>
/// Local development adapter'ı.
/// Production ortamında immutable object storage adapter'ı ile değiştirilecektir.
/// </summary>
internal sealed class LocalFileStagingService : IFileStagingService
{
    private const int BufferSize = 1024 * 1024;

    private readonly FileStagingOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly Mbb.Archive.Modules.Documents.Application.Settings.IUploadPolicyStore _policy;

    public LocalFileStagingService(
        IOptions<FileStagingOptions> options,
        TimeProvider timeProvider,
        Mbb.Archive.Modules.Documents.Application.Settings.IUploadPolicyStore policy)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
        _policy = policy;
    }

    public async Task<StagedFileDescriptor> StageAsync(
        DocumentFileIngestionId ingestionId,
        Stream source,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(source);

        if (!source.CanRead)
            throw new FileStagingRejectedException("Upload stream is not readable.");

        var policy = await _policy.GetAsync(cancellationToken);
        var maxBytes = Math.Min(_options.MaxUploadBytes, policy.MaxFileSizeMb * 1024L * 1024);
        var today = _timeProvider.GetUtcNow();
        var relativeKey = $"{today:yyyy/MM/dd}/{ingestionId.Value:N}.bin";

        var root = Path.GetFullPath(_options.RootPath);
        var finalPath = ResolveInsideRoot(root, relativeKey);
        var tempPath = finalPath + ".part";

        Directory.CreateDirectory(Path.GetDirectoryName(finalPath)!);

        var buffer = ArrayPool<byte>.Shared.Rent(BufferSize);
        long totalBytes = 0;

        try
        {
            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

            await using (var target = new FileStream(
                             tempPath,
                             FileMode.CreateNew,
                             FileAccess.Write,
                             FileShare.None,
                             BufferSize,
                             FileOptions.Asynchronous | FileOptions.SequentialScan))
            {
                while (true)
                {
                    var read = await source.ReadAsync(
                        buffer.AsMemory(0, BufferSize),
                        cancellationToken);

                    if (read == 0)
                        break;

                    totalBytes += read;

                    if (totalBytes > maxBytes)
                    {
                        throw new FileStagingRejectedException(
                            $"Upload exceeds the configured {maxBytes} byte limit.");
                    }

                    hash.AppendData(buffer, 0, read);

                    await target.WriteAsync(
                        buffer.AsMemory(0, read),
                        cancellationToken);
                }

                await target.FlushAsync(cancellationToken);
            }

            if (totalBytes == 0)
                throw new FileStagingRejectedException("Empty files cannot be staged.");

            File.Move(tempPath, finalPath);

            return new StagedFileDescriptor(
                relativeKey,
                Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant(),
                totalBytes);
        }
        catch
        {
            TryDelete(tempPath);
            throw;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }


    public Task<Stream> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = Path.GetFullPath(_options.RootPath);
        var fullPath = ResolveInsideRoot(root, storageKey);

        Stream stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            BufferSize,
            FileOptions.Asynchronous | FileOptions.SequentialScan);

        return Task.FromResult(stream);
    }

    public Task DeleteIfExistsAsync(
        string storageKey,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var root = Path.GetFullPath(_options.RootPath);
        var fullPath = ResolveInsideRoot(root, storageKey);

        TryDelete(fullPath);
        return Task.CompletedTask;
    }

    private static string ResolveInsideRoot(string root, string relativeKey)
    {
        var fullPath = Path.GetFullPath(
            Path.Combine(root, relativeKey.Replace('/', Path.DirectorySeparatorChar)));

        var normalizedRoot = root.TrimEnd(
            Path.DirectorySeparatorChar,
            Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(normalizedRoot, StringComparison.Ordinal))
            throw new InvalidOperationException("Storage key resolves outside the staging root.");

        return fullPath;
    }

    private static void TryDelete(string path)
    {
        if (File.Exists(path))
            File.Delete(path);
    }
}
