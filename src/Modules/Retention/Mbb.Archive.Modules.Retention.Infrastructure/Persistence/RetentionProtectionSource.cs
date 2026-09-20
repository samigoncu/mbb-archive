using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.Modules.Retention.Domain.Rules;
using Mbb.Archive.Modules.Retention.Domain.Disposition;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class RetentionProtectionSource(RetentionDbContext db) : IRetentionProtectionSource
{
    public async Task<IReadOnlyList<RetentionProtectionRequirement>> ListAsync(CancellationToken cancellationToken)
    {
        var cases = await db.Cases.AsNoTracking().Select(item => new RetentionProtectionRequirement(
            item.DocumentId, item.DueAt, item.ActiveHoldCount > 0,
            item.DigitalPreservationRequired || item.Action == DispositionAction.KeepPermanent)).ToArrayAsync(cancellationToken);
        var evidence = await db.Set<DispositionProcess>().AsNoTracking()
            .Where(process => process.ExecutionEvidenceDocumentId != null)
            .Select(process => new RetentionProtectionRequirement(process.ExecutionEvidenceDocumentId!.Value, null, false, true))
            .ToArrayAsync(cancellationToken);
        return cases.Concat(evidence).ToArray();
    }
}
