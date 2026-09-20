using Amazon.S3;
using Amazon.S3.Model;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal sealed partial class S3OriginalObjectStorage
{
    private static string? RealVersion(string? value) => string.IsNullOrWhiteSpace(value) || value == "null" ? null : value;

    public async Task<OriginalProtectionState> InspectAsync(string key, string? versionId, CancellationToken ct)
    {
        if (!_options.Worm.Enabled)
            throw new InvalidOperationException("S3 nesne kilidi yapılandırmada etkin değil.");
        var value = await _client.GetObjectMetadataAsync(new GetObjectMetadataRequest
            { BucketName = _options.S3.BucketName, Key = key, VersionId = versionId }, ct);
        var pinned = RealVersion(value.VersionId)
            ?? throw new InvalidOperationException("S3 sürüm kimliği yok; bucket versioning ve Object Lock kontrol edilmeli.");
        return new OriginalProtectionState(pinned, value.ContentLength,
            value.Metadata["x-amz-meta-sha256"],
            value.ObjectLockRetainUntilDate is { } until ? new DateTimeOffset(DateTime.SpecifyKind(until, DateTimeKind.Utc)) : null,
            value.ObjectLockLegalHoldStatus == ObjectLockLegalHoldStatus.On);
    }

    public async Task<OriginalProtectionState> ProtectAsync(string key, string versionId, DateTimeOffset? until,
        bool legalHold, CancellationToken ct)
    {
        var current = await InspectAsync(key, versionId, ct);
        // A policy change never shortens an existing retention period or bypasses governance.
        if (until is not null && until > DateTimeOffset.UtcNow && (current.RetainUntil is null || until > current.RetainUntil))
        {
            await _client.PutObjectRetentionAsync(new PutObjectRetentionRequest
            {
                BucketName = _options.S3.BucketName, Key = key, VersionId = versionId,
                Retention = new ObjectLockRetention
                {
                    Mode = _options.Worm.Mode.Equals("Compliance", StringComparison.OrdinalIgnoreCase)
                        ? ObjectLockRetentionMode.Compliance : ObjectLockRetentionMode.Governance,
                    RetainUntilDate = until.Value.UtcDateTime
                }
            }, ct);
        }
        if (current.LegalHold != legalHold)
            await _client.PutObjectLegalHoldAsync(new PutObjectLegalHoldRequest
            {
                BucketName = _options.S3.BucketName, Key = key, VersionId = versionId,
                LegalHold = new ObjectLockLegalHold { Status = legalHold ? ObjectLockLegalHoldStatus.On : ObjectLockLegalHoldStatus.Off }
            }, ct);
        var actual = await InspectAsync(key, versionId, ct);
        if (actual.LegalHold != legalHold || (until > DateTimeOffset.UtcNow && (actual.RetainUntil is null || actual.RetainUntil < until)))
            throw new InvalidOperationException("S3 kilit yazımı sonrasında beklenen koruma doğrulanamadı.");
        return actual;
    }
}
