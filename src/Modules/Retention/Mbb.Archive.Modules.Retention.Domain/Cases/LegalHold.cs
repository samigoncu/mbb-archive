using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Retention.Domain.Cases;

public sealed class LegalHold : AggregateRoot<Guid>
{
    private LegalHold() { }
    public Guid RetentionCaseId { get; private set; }
    public Guid ArchiveRecordId { get; private set; }
    public string Reason { get; private set; } = "";
    public string PlacedBy { get; private set; } = "";
    public DateTimeOffset PlacedAt { get; private set; }
    public DateTimeOffset? ReleasedAt { get; private set; }
    public string? ReleasedBy { get; private set; }
    public string? ReleaseReason { get; private set; }
    public bool IsActive => ReleasedAt is null;

    public static LegalHold Place(Guid caseId, Guid recordId, string reason, string placedBy, DateTimeOffset at)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 2000)
            throw new DomainRuleViolationException("Bloke gerekçesi gereklidir; en fazla 2000 karakter olabilir.");
        if (string.IsNullOrWhiteSpace(placedBy) || placedBy.Trim().Length > 300)
            throw new DomainRuleViolationException("Bloke koyan kişi gereklidir.");
        return new LegalHold { Id = Guid.CreateVersion7(), RetentionCaseId = caseId, ArchiveRecordId = recordId,
            Reason = reason.Trim(), PlacedBy = placedBy.Trim(), PlacedAt = at };
    }

    public void Release(DateTimeOffset at, string actor, string reason)
    {
        if (ReleasedAt is not null) return;
        if (string.IsNullOrWhiteSpace(actor) || actor.Trim().Length > 300
            || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 2000)
            throw new DomainRuleViolationException("Blokeyi kaldıran kişi ve kaldırma gerekçesi gereklidir.");
        ReleasedAt = at; ReleasedBy = actor.Trim(); ReleaseReason = reason.Trim();
    }
}
