using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Domain.Disposition;

public enum DispositionProcessStatus { Draft, UnderReview, PendingApproval, Approved, Rejected, Completed }

public sealed class DispositionProcess : AggregateRoot<Guid>
{
    private readonly List<DispositionReview> _reviews = [];
    private readonly List<CommissionMember> _members = [];
    private DispositionProcess() { }
    public Guid RetentionCaseId { get; private set; }
    public Guid DocumentId { get; private set; }
    public DispositionAction Action { get; private set; }
    public string Reason { get; private set; } = "";
    public string CommissionReference { get; private set; } = "";
    public string CreatedBy { get; private set; } = "";
    public DateTimeOffset CreatedAt { get; private set; }
    public DispositionProcessStatus Status { get; private set; }
    public int RequiredReviews { get; private set; }
    public string? ApprovedBy { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public string? ApprovalReference { get; private set; }
    public string? CompletedBy { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? ReceivingArchive { get; private set; }
    public string? ReceiptReference { get; private set; }
    public long ConcurrencyVersion { get; private set; }
    public IReadOnlyCollection<DispositionReview> Reviews => _reviews.AsReadOnly();
    public IReadOnlyCollection<CommissionMember> Members => _members.AsReadOnly();
    public DateTimeOffset? CommissionValidFrom { get; private set; }
    public DateTimeOffset? CommissionValidUntil { get; private set; }
    public string? CommissionConfiguredBy { get; private set; }
    public Guid? TransferPackageId { get; private set; }
    public string? TransferManifestJson { get; private set; }
    public string? TransferManifestSha256 { get; private set; }
    public string? TransferPackageSha256 { get; private set; }
    public long? TransferPackageSize { get; private set; }
    public string? PackageCreatedBy { get; private set; }
    public DateTimeOffset? PackageCreatedAt { get; private set; }
    public string? PackageVerifiedBy { get; private set; }
    public DateTimeOffset? PackageVerifiedAt { get; private set; }
    public Guid? ExecutionEvidenceDocumentId { get; private set; }
    public Guid? ExecutionEvidenceVersionId { get; private set; }
    public string? ExecutionEvidenceSha256 { get; private set; }
    public string? ExecutionMethod { get; private set; }
    public string? ExecutionLocation { get; private set; }
    public string? ExecutionWitnesses { get; private set; }
    public DateTimeOffset? PhysicalExecutedAt { get; private set; }

    public void ConfigureCommission(string actor, IEnumerable<string> subjects, DateTimeOffset from, DateTimeOffset until)
    {
        if (Status is not (DispositionProcessStatus.Draft or DispositionProcessStatus.UnderReview or DispositionProcessStatus.PendingApproval))
            throw new DomainRuleViolationException("Onaylanan veya tamamlanan işlemin komisyonu değiştirilemez.");
        var members = subjects.Select(x => x.Trim()).ToArray();
        if (from >= until || members.Length < RequiredReviews || members.Length > 20
            || members.Distinct(StringComparer.Ordinal).Count() != members.Length || members.Contains(CreatedBy))
            throw new DomainRuleViolationException("Komisyon en az gerekli görüş sayısınca ayrı üyeden oluşmalı; hazırlayan üye olamaz ve görev tarihleri geçerli olmalıdır.");
        if (_reviews.Count > 0 && _members.Count > 0)
        {
            if (!_members.Select(x => x.Subject).ToHashSet().SetEquals(members) || from > CommissionValidFrom || until < CommissionValidUntil)
                throw new DomainRuleViolationException("Görüşlerden sonra üyeler değiştirilemez ve görev süresi daraltılamaz; yalnız süre uzatılabilir.");
        }
        else
        {
            if (_reviews.Any(x => !members.Contains(x.Actor) || x.ReviewedAt < from || x.ReviewedAt > until))
                throw new DomainRuleViolationException("Önceki görüşleri korumak için görüş sahipleri ve görüş tarihleri görevlendirmede yer almalıdır.");
            _members.Clear();
            _members.AddRange(members.Select(x => CommissionMember.Create(Id, x)));
        }
        CommissionValidFrom = from; CommissionValidUntil = until;
        CommissionConfiguredBy = Require(actor, "Görevlendiren", 300); ConcurrencyVersion++;
    }

    public void DelegateMember(string memberSubject, string delegateSubject, string reference, DateTimeOffset from, DateTimeOffset until)
    {
        if (Status is not (DispositionProcessStatus.Draft or DispositionProcessStatus.UnderReview))
            throw new DomainRuleViolationException("Bu aşamada vekil atanamaz.");
        var member = _members.SingleOrDefault(x => x.Subject == memberSubject)
            ?? throw new DomainRuleViolationException("Komisyon üyesi bulunamadı.");
        if (_reviews.Any(x => x.Actor == member.Subject || x.Actor == member.DelegateSubject)
            || delegateSubject == CreatedBy || _members.Any(x => x.Subject == delegateSubject || x.DelegateSubject == delegateSubject)
            || from < CommissionValidFrom || until > CommissionValidUntil)
            throw new DomainRuleViolationException("Oy kullanan üye değiştirilemez; vekil bağımsız olmalı ve görevlendirme komisyon süresi içinde kalmalıdır.");
        member.Delegate(delegateSubject, reference, from, until); ConcurrencyVersion++;
    }

    public void RegisterTransferPackage(Guid id, string manifest, string manifestHash, string packageHash, long size,
        string actor, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Approved);
        if (Action != DispositionAction.Transfer || TransferPackageId is not null || id == Guid.Empty || size <= 0)
            throw new DomainRuleViolationException("Devir paketi yalnız onaylı devir için bir kez hazırlanabilir.");
        CheckCase(retentionCase, now);
        TransferPackageId = id; TransferManifestJson = manifest;
        TransferManifestSha256 = Require(manifestHash, "Manifest özeti", 64);
        TransferPackageSha256 = Require(packageHash, "Paket özeti", 64);
        TransferPackageSize = size; PackageCreatedBy = Require(actor, "Paketi hazırlayan", 300); PackageCreatedAt = now;
        ConcurrencyVersion++;
    }

    public void VerifyTransferPackage(Guid packageId, string actor, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Approved);
        if (packageId != TransferPackageId || Action != DispositionAction.Transfer || actor == CreatedBy || actor == ApprovedBy)
            throw new DomainRuleViolationException("İlgili devir paketi bağımsız teslim alan tarafından doğrulanmalıdır.");
        CheckCase(retentionCase, now);
        PackageVerifiedBy = Require(actor, "Doğrulayan", 300); PackageVerifiedAt = now; ConcurrencyVersion++;
    }

    public static DispositionProcess Create(Guid id, RetentionCase retentionCase,
        DispositionAction action, string reason, string commissionReference,
        string actor, int requiredReviews, DateTimeOffset now)
    {
        if (id == Guid.Empty) throw new DomainRuleViolationException("İşlem kimliği gereklidir.");
        if (!Enum.IsDefined(action) || action == DispositionAction.Review)
            throw new DomainRuleViolationException("Devir, imha veya kalıcı saklama kararı seçilmelidir.");
        if (requiredReviews is < 2 or > 20)
            throw new DomainRuleViolationException("En az iki bağımsız komisyon değerlendirmesi gereklidir.");
        retentionCase.EnsureDispositionAllowed(now);
        // A restrictive schedule cannot be changed into permission to destroy.
        if (action == DispositionAction.Destroy && retentionCase.Action != DispositionAction.Destroy)
            throw new DomainRuleViolationException("Bu saklama kuralı imha kararı verilmesine izin vermiyor.");
        return new DispositionProcess
        {
            Id = id, RetentionCaseId = retentionCase.Id, DocumentId = retentionCase.DocumentId,
            Action = action, Reason = Require(reason, "Gerekçe", 2000),
            CommissionReference = Require(commissionReference, "Komisyon görevlendirme referansı", 300),
            CreatedBy = Require(actor, "İşlemi hazırlayan", 300), CreatedAt = now,
            RequiredReviews = requiredReviews, Status = DispositionProcessStatus.Draft, ConcurrencyVersion = 1
        };
    }

    public void Submit(string actor, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Draft);
        if (actor != CreatedBy) throw new DomainRuleViolationException("Taslağı yalnız hazırlayan kişi gönderebilir.");
        CheckCase(retentionCase, now);
        EnsureCommissionActive(now);
        Status = DispositionProcessStatus.UnderReview;
        ConcurrencyVersion++;
    }

    public void Review(string actor, bool approved, string reason, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.UnderReview);
        actor = Require(actor, "Komisyon üyesi", 300);
        EnsureCommissionActive(now);
        var seat = _members.SingleOrDefault(x => x.Represents(actor, now))
            ?? throw new DomainRuleViolationException("Kullanıcı bu komisyonun görevli üyesi veya geçerli vekili değil.");
        if (actor == CreatedBy) throw new DomainRuleViolationException("Hazırlayan kişi kendi işlemini değerlendiremez.");
        if (_reviews.Any(review => review.Actor == actor || review.Actor == seat.Subject || review.Actor == seat.DelegateSubject))
            throw new DomainRuleViolationException("Aynı kişi bu işlem için birden fazla değerlendirme yapamaz.");
        CheckCase(retentionCase, now);
        _reviews.Add(DispositionReview.Create(Id, actor, approved, Require(reason, "Değerlendirme gerekçesi", 2000), now));
        Status = !approved ? DispositionProcessStatus.Rejected
            : _reviews.Count >= RequiredReviews ? DispositionProcessStatus.PendingApproval
            : DispositionProcessStatus.UnderReview;
        ConcurrencyVersion++;
    }

    public void Approve(string actor, string reference, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.PendingApproval);
        actor = Require(actor, "Onaylayan", 300);
        EnsureCommissionActive(now);
        if (actor == CreatedBy || _members.Any(member => member.Subject == actor || member.DelegateSubject == actor) || _reviews.Any(review => review.Actor == actor))
            throw new DomainRuleViolationException("Nihai onaylayan kişi hazırlayan ve komisyon üyelerinden farklı olmalıdır.");
        CheckCase(retentionCase, now);
        ApprovalReference = Require(reference, "Onay yazısı referansı", 300);
        ApprovedBy = actor; ApprovedAt = now;
        Status = DispositionProcessStatus.Approved;
        ConcurrencyVersion++;
    }

    public void AcceptTransfer(string actor, string receivingArchive, string receiptReference,
        RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Approved);
        if (Action != DispositionAction.Transfer)
            throw new DomainRuleViolationException("Yalnız devir kararı teslim alınabilir.");
        actor = Require(actor, "Teslim alan", 300);
        if (TransferPackageId is null || PackageVerifiedAt is null || PackageVerifiedBy != actor)
            throw new DomainRuleViolationException("Teslim alan kullanıcı bu işleme ait paketi yükleyip doğrulamalıdır.");
        if (actor == CreatedBy || actor == ApprovedBy)
            throw new DomainRuleViolationException("Teslim alan kişi hazırlayan ve onaylayandan farklı olmalıdır.");
        CheckCase(retentionCase, now);
        ReceivingArchive = Require(receivingArchive, "Teslim alan arşiv", 300);
        ReceiptReference = Require(receiptReference, "Teslim tutanağı referansı", 300);
        Complete(actor, now);
        retentionCase.CompleteDisposition(now);
    }

    public void KeepPermanently(string actor, RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Approved);
        if (Action != DispositionAction.KeepPermanent)
            throw new DomainRuleViolationException("Karar kalıcı saklama olmalıdır.");
        CheckCase(retentionCase, now);
        Complete(Require(actor, "Uygulayan", 300), now);
        retentionCase.KeepPermanently(now);
    }

    public void ExecuteDestruction(string actor, string protocolReference, Guid evidenceDocumentId, Guid evidenceVersionId,
        string evidenceSha256, string method, string location, string witnesses, DateTimeOffset executedAt,
        RetentionCase retentionCase, DateTimeOffset now)
    {
        EnsureState(DispositionProcessStatus.Approved);
        if (Action != DispositionAction.Destroy)
            throw new DomainRuleViolationException("Yalnız onaylanmış imha kararı yürütülebilir.");
        actor = Require(actor, "İmhayı uygulayan", 300);
        if (actor == CreatedBy || actor == ApprovedBy)
            throw new DomainRuleViolationException("İmhayı uygulayan kişi hazırlayan ve nihai onaylayandan farklı olmalıdır.");
        CheckCase(retentionCase, now);
        if (evidenceDocumentId == Guid.Empty || evidenceVersionId == Guid.Empty || evidenceDocumentId == DocumentId
            || evidenceSha256.Length != 64 || executedAt > now || executedAt < ApprovedAt)
            throw new DomainRuleViolationException("Fiziksel imha için ayrı tutanak belgesi, doğrulanmış sürüm ve onay sonrasındaki gerçekleşme tarihi gereklidir.");
        ExecutionEvidenceDocumentId = evidenceDocumentId; ExecutionEvidenceVersionId = evidenceVersionId;
        ExecutionEvidenceSha256 = evidenceSha256;
        ExecutionMethod = Require(method, "Fiziksel imha yöntemi", 300);
        ExecutionLocation = Require(location, "Fiziksel imha yeri", 300);
        ExecutionWitnesses = Require(witnesses, "İmha tanıkları", 2000);
        PhysicalExecutedAt = executedAt;
        ReceiptReference = Require(protocolReference, "İmha protokol referansı", 300);
        Complete(actor, now);
        retentionCase.CompletePhysicalDisposition(now);
    }

    private void Complete(string actor, DateTimeOffset now)
    {
        CompletedBy = actor; CompletedAt = now;
        Status = DispositionProcessStatus.Completed; ConcurrencyVersion++;
    }

    private void CheckCase(RetentionCase retentionCase, DateTimeOffset now)
    {
        if (retentionCase.Id != RetentionCaseId)
            throw new DomainRuleViolationException("Saklama dosyası bu işleme ait değil.");
        retentionCase.EnsureDispositionAllowed(now);
        // Persist both tokens: a simultaneous hold must invalidate the approval transaction.
        retentionCase.TouchDisposition();
    }

    private void EnsureState(DispositionProcessStatus expected)
    {
        if (Status != expected) throw new DomainRuleViolationException("İşlemin güncel durumu bu adıma uygun değil.");
    }

    private void EnsureCommissionActive(DateTimeOffset now)
    {
        if (_members.Count < RequiredReviews || CommissionValidFrom is null || CommissionValidUntil is null
            || now < CommissionValidFrom || now > CommissionValidUntil)
            throw new DomainRuleViolationException("Üyeleri tanımlanmış ve görev süresi devam eden komisyon gereklidir.");
    }

    private static string Require(string? value, string name, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
            throw new DomainRuleViolationException($"{name} gereklidir ve en fazla {maxLength} karakter olabilir.");
        return value.Trim();
    }
}
