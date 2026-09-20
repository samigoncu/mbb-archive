using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal sealed class OriginalProtectionSynchronizer(DocumentsDbContext db, IOriginalObjectStorage storage,
    ICurrentUserScope scope, TimeProvider time) : IOriginalProtectionSynchronizer
{
    public async Task<ProtectionSyncResult> SynchronizeAsync(IReadOnlyList<DocumentProtectionRequirement> requirements,
        CancellationToken cancellationToken)
    {
        if (storage is not IOriginalProtectionStorage protector) return new(false, 0, 0, 0);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var acquired = await db.Database.SqlQueryRaw<bool>("SELECT pg_try_advisory_xact_lock(72617263686976) AS \"Value\"")
            .SingleAsync(cancellationToken);
        if (!acquired) throw new InvalidOperationException("Dijital koruma eşitlemesi zaten çalışıyor.");
        var requested = requirements.GroupBy(x => new DocumentId(x.DocumentId)).ToDictionary(x => x.Key, x => x.ToArray());
        var ids = requested.Keys.ToArray();
        var keys = await db.Set<DocumentVersion>().Where(x => ids.Contains(x.DocumentId) || x.OwnsStorageLegalHold)
            .Select(x => x.StorageKey).Distinct().ToListAsync(cancellationToken);
        // Include every reference to a deduplicated original before deriving its protection.
        var versions = await db.Set<DocumentVersion>().Where(x => keys.Contains(x.StorageKey))
            // Sıralamasız sorgu, aynı veriyle farklı sonuç üretebilir: gruplar
            // sırayla işlendiği için işleme sırası deterministik olmalıdır.
            .OrderBy(x => x.StorageKey).ThenBy(x => x.StorageVersionId).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        var groups = versions.GroupBy(x => (x.StorageKey, x.StorageVersionId)).ToArray();
        var successful = 0; var failed = 0;
        foreach (var group in groups)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var representative = group.First();
            try
            {
                var requirement = OriginalProtectionPolicy.Combine(versions.Where(x => x.StorageKey == group.Key.StorageKey).SelectMany(x =>
                    requested.GetValueOrDefault(x.DocumentId) ?? []));
                var current = await protector.InspectAsync(group.Key.StorageKey, group.Key.StorageVersionId, cancellationToken);
                if (current.SizeBytes != representative.SizeBytes)
                    throw new InvalidOperationException("Nesne boyutu arşiv kaydıyla eşleşmiyor.");
                if (group.Key.StorageVersionId is null)
                {
                    // Legacy objects are pinned only after verifying their actual bytes, not just S3 metadata.
                    await using var stream = await storage.OpenReadVersionAsync(group.Key.StorageKey, current.VersionId, cancellationToken)
                        ?? throw new InvalidOperationException("Depo nesnesine erişilemiyor.");
                    var digest = Convert.ToHexStringLower(await SHA256.HashDataAsync(stream, cancellationToken));
                    if (group.Any(x => !digest.Equals(x.Sha256Hash, StringComparison.OrdinalIgnoreCase)))
                        throw new InvalidOperationException("Nesne hash değeri arşiv kaydıyla eşleşmiyor.");
                }
                // An already-existing external hold is never removed by this application.
                //
                // Sahiplik, nesnenin tamamı için sorulur: aynı depolama anahtarı
                // birden çok belge sürümü tarafından paylaşılabilir ve bunlar
                // sabitlenmiş sürüm kimliğine göre ayrı gruplara düşer. Yalnız
                // gruba bakılırsa, bekletmeyi bu uygulama koymuş olsa bile
                // sabitlenmemiş referans onu "dış bekletme" sanır ve kaldıramaz.
                var owned = versions.Any(x =>
                    x.StorageKey == group.Key.StorageKey && x.OwnsStorageLegalHold);
                var externalHold = current.LegalHold && !owned;
                var desiredHold = requirement.LegalHold || requirement.Permanent || externalHold;
                var result = await protector.ProtectAsync(group.Key.StorageKey, current.VersionId,
                    requirement.RetainUntil, desiredHold, cancellationToken);
                if (result.VersionId != current.VersionId || group.Any(x => x.StorageVersionId is not null && x.StorageVersionId != result.VersionId))
                    throw new InvalidOperationException("Depo yanıtındaki sürüm arşivde sabitlenmiş nesneyle eşleşmiyor.");
                var now = time.GetUtcNow();
                foreach (var version in group)
                {
                    var changed = version.StorageVersionId != result.VersionId || version.ProtectionError is not null
                        || version.StorageLegalHold != result.LegalHold || version.ProtectedUntil != result.RetainUntil;
                    version.PinStorageVersion(result.VersionId);
                    version.RecordProtection(result.RetainUntil, result.LegalHold,
                        desiredHold && !externalHold, null, now);
                    if (changed) db.Enqueue(new OriginalProtectionChanged(Guid.CreateVersion7(), version.DocumentId.Value,
                        version.Id, result.VersionId, result.RetainUntil, result.LegalHold, now));
                }
                successful++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                failed++;
                // Provider messages may contain infrastructure details; publish a safe operational status.
                var code = exception is InvalidOperationException ? exception.Message : "Depo koruması doğrulanamadı; servis günlüğünü kontrol edin.";
                foreach (var version in group)
                    version.RecordProtection(null, false, false, code.Length > 1000 ? code[..1000] : code, time.GetUtcNow());
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new(true, groups.Length, successful, failed);
    }

    public async Task<IReadOnlyList<OriginalProtectionStatus>> GetStatusAsync(Guid documentId, CancellationToken cancellationToken)
    {
        var visible = await scope.GetAsync(cancellationToken);
        return await db.Documents.AsNoTracking().Where(DocumentAccessFilter.For(visible))
            .Where(x => x.Id == new DocumentId(documentId)).SelectMany(x => x.Versions)
            .OrderBy(x => x.VersionNumber).Select(x => new OriginalProtectionStatus(x.Id, x.VersionNumber,
                x.StorageVersionId, x.ProtectionCheckedAt, x.ProtectedUntil, x.StorageLegalHold, x.ProtectionError))
            .ToListAsync(cancellationToken);
    }

    private sealed record OriginalProtectionChanged(Guid EventId, Guid DocumentId, Guid VersionId,
        string StorageVersionId, DateTimeOffset? RetainUntil, bool LegalHold, DateTimeOffset OccurredAt) : IIntegrationEvent
    {
        public string EventName => "documents.original-protection-changed.v1";
    }
}
