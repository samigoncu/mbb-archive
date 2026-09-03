using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Operations;

internal sealed class DocumentsOriginalFixityVerifier :
    IIntegrityVerificationContributor
{
    private readonly DocumentsDbContext _db;
    private readonly IOriginalObjectStorage _storage;
    private readonly DocumentsFixityOptions _options;
    private readonly TimeProvider _timeProvider;

    public DocumentsOriginalFixityVerifier(
        DocumentsDbContext db,
        IOriginalObjectStorage storage,
        IOptions<DocumentsFixityOptions> options,
        TimeProvider timeProvider)
    {
        _db = db;
        _storage = storage;
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public string CheckName => "documents.original_fixity";

    public async Task<IntegrityVerificationResult> VerifyAsync(
        CancellationToken cancellationToken)
    {
        var startedAt = _timeProvider.GetUtcNow();

        var sample = await _db.Documents
            .AsNoTracking()
            .SelectMany(x => x.Versions)
            .OrderByDescending(x => x.CreatedAt)
            .Take(Math.Clamp(_options.SampleSize, 1, 500))
            .Select(x => new
            {
                x.Id,
                x.StorageKey,
                x.Sha256Hash,
                x.SizeBytes
            })
            .ToListAsync(cancellationToken);

        var failures = new List<object>();

        foreach (var version in sample)
        {
            var result = await _storage.VerifyAsync(
                version.StorageKey,
                version.Sha256Hash,
                version.SizeBytes,
                cancellationToken);

            if (!result.Exists || !result.SizeMatches || !result.HashMatches)
            {
                failures.Add(
                    new
                    {
                        versionId = version.Id,
                        version.StorageKey,
                        result.Exists,
                        result.SizeMatches,
                        result.HashMatches,
                        result.ActualSizeBytes,
                        result.ActualSha256Hash,
                        result.Error
                    });
            }
        }

        var health = failures.Count == 0
            ? OperationalHealth.Healthy
            : OperationalHealth.Unhealthy;

        return new IntegrityVerificationResult(
            CheckName,
            health,
            startedAt,
            _timeProvider.GetUtcNow(),
            sample.Count,
            failures.Count,
            failures.Count == 0
                ? $"Verified {sample.Count} original object(s)."
                : $"{failures.Count} of {sample.Count} original objects failed fixity.",
            JsonSerializer.Serialize(failures));
    }
}
