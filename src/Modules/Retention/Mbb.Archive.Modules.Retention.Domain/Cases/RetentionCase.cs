using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Domain.Cases;

public enum RetentionCaseStatus { Scheduled = 0, Held = 1, Eligible = 2, Completed = 3 }

public sealed class RetentionCase : AggregateRoot<Guid>
{
    private RetentionCase() { }
    public Guid ArchiveRecordId { get; private set; }
    public Guid DocumentId { get; private set; }
    public Guid RuleId { get; private set; }
    public string RuleCode { get; private set; } = "";
    public DispositionAction Action { get; private set; }
    public DateTimeOffset TriggerAt { get; private set; }
    public DateTimeOffset? DueAt { get; private set; }
    public RetentionCaseStatus Status { get; private set; }
    public int ActiveHoldCount { get; private set; }
    public long ConcurrencyVersion { get; private set; }
    public bool DigitalPreservationRequired { get; private set; }

    public static RetentionCase Schedule(Guid recordId, Guid documentId, RetentionRule rule, DateTimeOffset declaredAt)
    {
        if (recordId == Guid.Empty || documentId == Guid.Empty)
            throw new DomainRuleViolationException("Kayıt ve belge kimliği gereklidir.");
        return new RetentionCase
        {
            Id = Guid.CreateVersion7(), ArchiveRecordId = recordId, DocumentId = documentId,
            RuleId = rule.Id, RuleCode = rule.Code, Action = rule.Action, TriggerAt = declaredAt,
            DueAt = rule.Action == DispositionAction.KeepPermanent ? null : declaredAt.AddMonths(rule.RetentionMonths),
            Status = RetentionCaseStatus.Scheduled, ConcurrencyVersion = 1
        };
    }

    public void PlaceHold()
    {
        if (Status == RetentionCaseStatus.Completed && !DigitalPreservationRequired)
            throw new DomainRuleViolationException("Tamamlanmış tasfiye dosyasına bloke eklenemez.");
        ActiveHoldCount++; Status = RetentionCaseStatus.Held; ConcurrencyVersion++;
    }

    public void ReleaseHold()
    {
        if (ActiveHoldCount <= 0) throw new DomainRuleViolationException("Etkin hukuki bloke yok.");
        ActiveHoldCount--; Status = ActiveHoldCount > 0 ? RetentionCaseStatus.Held : RetentionCaseStatus.Scheduled;
        ConcurrencyVersion++;
    }

    public bool Evaluate(DateTimeOffset now)
    {
        if (Status is RetentionCaseStatus.Eligible or RetentionCaseStatus.Completed) return false;
        if (ActiveHoldCount > 0 || DueAt is null || DueAt > now) return false;
        Status = RetentionCaseStatus.Eligible; ConcurrencyVersion++; return true;
    }

    public void EnsureDispositionAllowed(DateTimeOffset now)
    {
        if (ActiveHoldCount > 0) throw new DomainRuleViolationException("Etkin hukuki bloke varken tasfiye işlemi ilerletilemez.");
        if (Status == RetentionCaseStatus.Completed || DueAt is null || DueAt > now)
            throw new DomainRuleViolationException("Saklama süresi dolmamış veya dosya tamamlanmış.");
    }

    public void TouchDisposition() => ConcurrencyVersion++;

    public void CompleteDisposition(DateTimeOffset now)
    {
        EnsureDispositionAllowed(now); Status = RetentionCaseStatus.Completed; ConcurrencyVersion++;
    }

    public void CompletePhysicalDisposition(DateTimeOffset now)
    {
        EnsureDispositionAllowed(now);
        DigitalPreservationRequired = true;
        Action = DispositionAction.KeepPermanent;
        DueAt = null;
        Status = RetentionCaseStatus.Scheduled;
        ConcurrencyVersion++;
    }

    public void KeepPermanently(DateTimeOffset now)
    {
        EnsureDispositionAllowed(now);
        Action = DispositionAction.KeepPermanent; DueAt = null;
        Status = RetentionCaseStatus.Scheduled; ConcurrencyVersion++;
    }
}
