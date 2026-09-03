using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Audit.Infrastructure;

internal sealed class AuditOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly AuditDbContext _db;
    private readonly TimeProvider _timeProvider;

    public AuditOperationalSnapshotContributor(
        AuditDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "audit";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var count = await _db.Entries.AsNoTracking().LongCountAsync(
            cancellationToken);

        var lastSequence = await _db.Entries.AsNoTracking()
            .OrderByDescending(x => x.Sequence)
            .Select(x => (long?)x.Sequence)
            .FirstOrDefaultAsync(cancellationToken)
            ?? 0;

        return new OperationalComponentSnapshot(
            Component,
            OperationalHealth.Healthy,
            _timeProvider.GetUtcNow(),
            [
                new("entries", count),
                new("last_sequence", lastSequence)
            ],
            []);
    }
}

internal sealed class AuditHashChainVerifier :
    IIntegrityVerificationContributor
{
    private readonly AuditDbContext _db;
    private readonly TimeProvider _timeProvider;

    public AuditHashChainVerifier(
        AuditDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string CheckName => "audit.hash_chain";

    public async Task<IntegrityVerificationResult> VerifyAsync(
        CancellationToken cancellationToken)
    {
        var startedAt = _timeProvider.GetUtcNow();
        var previousHash = new string('0', 64);
        long lastSequence = 0;
        long checkedItems = 0;
        var failures = new List<object>();

        while (true)
        {
            var batch = await _db.Entries
                .AsNoTracking()
                .Where(x => x.Sequence > lastSequence)
                .OrderBy(x => x.Sequence)
                .Take(1000)
                .ToListAsync(cancellationToken);

            if (batch.Count == 0)
                break;

            foreach (var entry in batch)
            {
                checkedItems++;

                var expectedSequence = lastSequence + 1;
                var expectedHash = ComputeHash(
                    previousHash,
                    entry.MessageId,
                    entry.EventName,
                    entry.OccurredAt,
                    entry.Payload);

                var sequenceValid = entry.Sequence == expectedSequence;
                var previousValid = string.Equals(
                    entry.PreviousHash,
                    previousHash,
                    StringComparison.OrdinalIgnoreCase);

                var hashValid = string.Equals(
                    entry.EntryHash,
                    expectedHash,
                    StringComparison.OrdinalIgnoreCase);

                if (!sequenceValid || !previousValid || !hashValid)
                {
                    failures.Add(
                        new
                        {
                            entry.Sequence,
                            expectedSequence,
                            previousValid,
                            hashValid
                        });
                }

                lastSequence = entry.Sequence;
                previousHash = entry.EntryHash;
            }
        }

        return new IntegrityVerificationResult(
            CheckName,
            failures.Count == 0
                ? OperationalHealth.Healthy
                : OperationalHealth.Unhealthy,
            startedAt,
            _timeProvider.GetUtcNow(),
            checkedItems,
            failures.Count,
            failures.Count == 0
                ? $"Audit hash chain verified across {checkedItems} entries."
                : $"Audit hash chain contains {failures.Count} mismatch(es).",
            JsonSerializer.Serialize(failures.Take(100)));
    }

    private static string ComputeHash(
        string previousHash,
        Guid messageId,
        string eventName,
        DateTimeOffset occurredAt,
        string payload)
        => Convert.ToHexString(
                SHA256.HashData(
                    Encoding.UTF8.GetBytes(
                        $"{previousHash}|{messageId:D}|{eventName}|{occurredAt:O}|{payload}")))
            .ToLowerInvariant();
}
