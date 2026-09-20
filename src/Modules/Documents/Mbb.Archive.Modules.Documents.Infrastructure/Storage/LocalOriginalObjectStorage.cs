using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

/// <summary>
/// Development/on-prem fallback adapter.
/// Production immutability için filesystem ACL tek başına yeterli değildir;
/// production deployment S3 Object Lock/WORM yeteneği sağlamalıdır.
/// </summary>
internal sealed class LocalOriginalObjectStorage : IOriginalObjectStorage
{
    private const int BufferSize = 1024 * 1024;

    private readonly OriginalStorageOptions _options;

    public LocalOriginalObjectStorage(
        IOptions<OriginalStorageOptions> options)
    {
        _options = options.Value;
    }

    public async Task<StoredOriginalDescriptor> StoreAsync(
        string sha256Hash,
        string mimeType,
        long expectedSizeBytes,
        Stream content,
        CancellationToken cancellationToken)
    {
        var key = OriginalStorageKey.FromSha256(sha256Hash);
        var root = Path.GetFullPath(_options.LocalRootPath);
        var finalPath = ResolveInsideRoot(root, key);

        Directory.CreateDirectory(Path.GetDirectoryName(finalPath)!);

        if (File.Exists(finalPath))
        {
            var existing = new FileInfo(finalPath);

            if (existing.Length != expectedSizeBytes)
            {
                throw new InvalidOperationException(
                    "Content-addressed original exists with an unexpected size.");
            }

            return new StoredOriginalDescriptor(
                key,
                existing.Length,
                sha256Hash.ToLowerInvariant());
        }

        var tempPath = $"{finalPath}.{Guid.CreateVersion7():N}.part";

        try
        {
            await using var target = new FileStream(
                tempPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                BufferSize,
                FileOptions.Asynchronous | FileOptions.SequentialScan);

            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

            var buffer = new byte[BufferSize];
            long size = 0;

            while (true)
            {
                var read = await content.ReadAsync(buffer, cancellationToken);

                if (read == 0)
                    break;

                size += read;
                hash.AppendData(buffer, 0, read);

                await target.WriteAsync(
                    buffer.AsMemory(0, read),
                    cancellationToken);
            }

            await target.FlushAsync(cancellationToken);

            var actualHash =
                Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();

            if (!string.Equals(
                    actualHash,
                    sha256Hash,
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Original storage hash verification failed.");
            }

            if (size != expectedSizeBytes)
            {
                throw new InvalidOperationException(
                    "Original storage size verification failed.");
            }

            try
            {
                File.Move(tempPath, finalPath);
                ApplyWriteOnceProtection(finalPath);
            }
            catch (IOException) when (File.Exists(finalPath))
            {
                // Aynı hash eşzamanlı promote edilmiş olabilir.
                // Content-addressed key nedeniyle existing object aynı içeriği temsil etmelidir.
                File.Delete(tempPath);
            }

            return new StoredOriginalDescriptor(
                key,
                size,
                actualHash);
        }
        catch
        {
            if (File.Exists(tempPath))
                File.Delete(tempPath);

            throw;
        }
    }


    /// <summary>
    /// §3.1 WORM'un yerel karşılığı. Dosya salt okunur işaretlenir; bu,
    /// uygulama ya da worker kaynaklı kazara üzerine yazmayı engeller.
    /// Gerçek WORM garantisi için production'da S3 Object Lock kullanılmalıdır.
    /// </summary>
    private void ApplyWriteOnceProtection(string path)
    {
        if (!_options.Worm.Enabled)
            return;

        try
        {
            File.SetAttributes(path, File.GetAttributes(path) | FileAttributes.ReadOnly);
        }
        catch (UnauthorizedAccessException)
        {
            // Dosya sistemi öznitelik desteklemiyorsa yazım geçerliliğini
            // kaybetmez; içerik zaten hash ile adreslenmiştir.
        }
        catch (IOException)
        {
        }
    }

    public Task<Stream?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken)
    {
        var root = Path.GetFullPath(_options.LocalRootPath);
        var fullPath = ResolveInsideRoot(root, storageKey);

        if (!File.Exists(fullPath))
            return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            BufferSize,
            FileOptions.Asynchronous | FileOptions.SequentialScan);

        return Task.FromResult<Stream?>(stream);
    }

    public async Task<ObjectFixityResult> VerifyAsync(
        string storageKey,
        string expectedSha256Hash,
        long expectedSizeBytes,
        CancellationToken cancellationToken)
    {
        var root = Path.GetFullPath(_options.LocalRootPath);
        var fullPath = ResolveInsideRoot(root, storageKey);

        if (!File.Exists(fullPath))
        {
            return new ObjectFixityResult(
                false,
                false,
                false,
                0,
                null,
                "Object does not exist.");
        }

        await using var stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            BufferSize,
            FileOptions.Asynchronous | FileOptions.SequentialScan);

        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[BufferSize];
        long size = 0;

        while (true)
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);

            if (read == 0)
                break;

            size += read;
            hash.AppendData(buffer, 0, read);
        }

        var actualHash =
            Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();

        return new ObjectFixityResult(
            true,
            size == expectedSizeBytes,
            string.Equals(
                actualHash,
                expectedSha256Hash,
                StringComparison.OrdinalIgnoreCase),
            size,
            actualHash,
            null);
    }

    private static string ResolveInsideRoot(
        string root,
        string storageKey)
    {
        var fullPath = Path.GetFullPath(
            Path.Combine(
                root,
                storageKey.Replace('/', Path.DirectorySeparatorChar)));

        var normalizedRoot =
            root.TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(normalizedRoot, StringComparison.Ordinal))
            throw new InvalidOperationException("Original storage key resolves outside root.");

        return fullPath;
    }
}
