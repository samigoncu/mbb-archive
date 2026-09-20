using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Retention.Domain.Disposition;

public sealed class CommissionMember : Entity<Guid>
{
    private CommissionMember() { }
    public Guid ProcessId { get; private set; }
    public string Subject { get; private set; } = "";
    public string? DelegateSubject { get; private set; }
    public string? DelegationReference { get; private set; }
    public DateTimeOffset? DelegateFrom { get; private set; }
    public DateTimeOffset? DelegateUntil { get; private set; }

    public static CommissionMember Create(Guid processId, string subject)
    {
        if (string.IsNullOrWhiteSpace(subject) || subject.Trim().Length > 300)
            throw new DomainRuleViolationException("Komisyon üyesinin kullanıcı kimliği gereklidir.");
        return new CommissionMember { Id = Guid.CreateVersion7(), ProcessId = processId, Subject = subject.Trim() };
    }

    public bool Represents(string actor, DateTimeOffset now)
        => DelegateSubject is not null && DelegateFrom <= now && DelegateUntil >= now
            ? actor == DelegateSubject : actor == Subject;

    internal void Delegate(string subject, string reference, DateTimeOffset from, DateTimeOffset until)
    {
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 300 || string.IsNullOrWhiteSpace(reference)
            || reference.Length > 300 || from >= until)
            throw new DomainRuleViolationException("Vekil, görevlendirme referansı ve geçerli tarih aralığı gereklidir.");
        DelegateSubject = subject.Trim(); DelegationReference = reference.Trim(); DelegateFrom = from; DelegateUntil = until;
    }
}
