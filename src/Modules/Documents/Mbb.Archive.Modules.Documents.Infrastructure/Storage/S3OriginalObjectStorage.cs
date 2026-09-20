using System.Security.Cryptography;
using System.Net;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

/// <summary>
/// AWS S3 veya S3-compatible storage adapter'ı.
/// Bucket tarafında versioning + Object Lock/WORM policy deployment sorumluluğudur.
/// </summary>
internal sealed partial class S3OriginalObjectStorage : IOriginalObjectStorage, IOriginalProtectionStorage
{
    private readonly OriginalStorageOptions _options;
    private readonly IAmazonS3 _client;

    public S3OriginalObjectStorage(
        IOptions<OriginalStorageOptions> options)
    {
        _options = options.Value;
        _client = CreateClient(_options.S3);
    }

    public async Task<StoredOriginalDescriptor> StoreAsync(
        string sha256Hash,
        string mimeType,
        long expectedSizeBytes,
        Stream content,
        CancellationToken cancellationToken)
    {
        var key = OriginalStorageKey.FromSha256(sha256Hash);

        if (await ExistsAsync(key, expectedSizeBytes, cancellationToken))
        {
            var existing = await _client.GetObjectMetadataAsync(new GetObjectMetadataRequest
                { BucketName = _options.S3.BucketName, Key = key }, cancellationToken);
            return new StoredOriginalDescriptor(
                key,
                expectedSizeBytes,
                sha256Hash.ToLowerInvariant(), RealVersion(existing.VersionId));
        }

        var request = new PutObjectRequest
        {
            BucketName = _options.S3.BucketName,
            Key = key,
            InputStream = content,
            AutoCloseStream = false,
            ContentType = mimeType
        };

        request.Metadata["sha256"] = sha256Hash.ToLowerInvariant();

        ApplyObjectLock(request);

        var stored = await _client.PutObjectAsync(request, cancellationToken);

        return new StoredOriginalDescriptor(
            key,
            expectedSizeBytes,
            sha256Hash.ToLowerInvariant(), RealVersion(stored.VersionId));
    }


    /// <summary>
    /// §3.1 WORM. Bucket'ta Object Lock etkinse nesne, saklama süresi
    /// dolmadan silinemez ve üzerine yazılamaz hale gelir. Kapalıyken
    /// istek değiştirilmez ve mevcut davranış korunur.
    /// </summary>
    private void ApplyObjectLock(PutObjectRequest request)
    {
        var worm = _options.Worm;

        if (!worm.Enabled)
            return;

        request.ObjectLockMode =
            string.Equals(worm.Mode, "Compliance", StringComparison.OrdinalIgnoreCase)
                ? ObjectLockMode.Compliance
                : ObjectLockMode.Governance;

        request.ObjectLockRetainUntilDate =
            DateTime.UtcNow.AddDays(Math.Max(worm.RetentionDays, 1));
    }

    public Task<Stream?> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken)
        => OpenReadVersionAsync(storageKey, null, cancellationToken);

    public async Task<Stream?> OpenReadVersionAsync(string storageKey, string? storageVersionId,
        CancellationToken cancellationToken)
    {
        try
        {
            // Response dispose edilmez; stream'in sahipliği çağırana geçer.
            var response = await _client.GetObjectAsync(
                new GetObjectRequest
                {
                    BucketName = _options.S3.BucketName,
                    Key = storageKey,
                    VersionId = storageVersionId
                },
                cancellationToken);

            return response.ResponseStream;
        }
        catch (AmazonS3Exception exception)
            when (exception.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<ObjectFixityResult> VerifyAsync(
        string storageKey,
        string expectedSha256Hash,
        long expectedSizeBytes,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _client.GetObjectAsync(
                new GetObjectRequest
                {
                    BucketName = _options.S3.BucketName,
                    Key = storageKey
                },
                cancellationToken);

            using var hash =
                IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

            var buffer = new byte[1024 * 1024];
            long size = 0;

            while (true)
            {
                var read = await response.ResponseStream.ReadAsync(
                    buffer,
                    cancellationToken);

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
        catch (AmazonS3Exception ex)
            when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new ObjectFixityResult(
                false,
                false,
                false,
                0,
                null,
                "Object does not exist.");
        }
        catch (Exception ex)
        {
            return new ObjectFixityResult(
                false,
                false,
                false,
                0,
                null,
                ex.Message);
        }
    }

    private async Task<bool> ExistsAsync(
        string key,
        long expectedSizeBytes,
        CancellationToken cancellationToken)
    {
        try
        {
            var metadata = await _client.GetObjectMetadataAsync(
                new GetObjectMetadataRequest
                {
                    BucketName = _options.S3.BucketName,
                    Key = key
                },
                cancellationToken);

            if (metadata.ContentLength != expectedSizeBytes)
            {
                throw new InvalidOperationException(
                    "Content-addressed S3 object exists with unexpected size.");
            }

            return true;
        }
        catch (AmazonS3Exception ex)
            when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    private static IAmazonS3 CreateClient(
        OriginalStorageOptions.S3Options options)
    {
        if (string.IsNullOrWhiteSpace(options.BucketName))
            throw new InvalidOperationException("Documents:OriginalStorage:S3:BucketName is required.");

        var config = new AmazonS3Config
        {
            ForcePathStyle = options.ForcePathStyle
        };

        if (!string.IsNullOrWhiteSpace(options.ServiceUrl))
            config.ServiceURL = options.ServiceUrl;

        if (!string.IsNullOrWhiteSpace(options.Region))
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(options.Region);

        if (!string.IsNullOrWhiteSpace(options.AccessKey) &&
            !string.IsNullOrWhiteSpace(options.SecretKey))
        {
            return new AmazonS3Client(
                new BasicAWSCredentials(
                    options.AccessKey,
                    options.SecretKey),
                config);
        }

        return new AmazonS3Client(config);
    }
}
