using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Documents.Domain.Documents;

public sealed partial class Document
{
    public bool CancelVersion(int number, int? replacement, long expectedVersion, Guid requestId,
        string actor, string reason, DateTimeOffset now)
    {
        if (requestId == Guid.Empty || string.IsNullOrWhiteSpace(actor) || actor.Length > 200
            || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 1000)
            throw new DomainRuleViolationException("İşlem kimliği, kullanıcı ve en fazla 1000 karakterlik iptal gerekçesi zorunludur.");
        var version = _versions.SingleOrDefault(v => v.VersionNumber == number)
            ?? throw new DomainRuleViolationException("İptal edilecek sürüm bulunamadı.");
        if (version.CancellationRequestId == requestId && version.CancelledBy == actor.Trim()
            && version.CancellationReason == reason.Trim() && version.ReplacementVersionNumber == replacement) return false;
        EnsureMutable();
        if (ConcurrencyVersion != expectedVersion)
            throw new DomainRuleViolationException("Belge değişmiş. Sayfayı yenileyip sürümleri yeniden kontrol edin.");
        if (version.CancelledAt is not null || _versions.Any(v => v.CancellationRequestId == requestId))
            throw new DomainRuleViolationException("Sürüm zaten iptal edilmiş veya işlem kimliği daha önce kullanılmış.");
        if (CurrentVersionNumber == number)
        {
            if (replacement is null || replacement == number || !_versions.Any(v => v.VersionNumber == replacement && v.CancelledAt is null))
                throw new DomainRuleViolationException("Güncel sürüm için başka bir geçerli sürüm seçin. Tek geçerli sürüm varsa önce yeni sürüm yükleyin.");
            CurrentVersionNumber = replacement;
        }
        else if (replacement is not null)
            throw new DomainRuleViolationException("Yalnızca güncel sürüm iptal edilirken yerine geçecek sürüm seçilebilir.");
        version.Cancel(requestId, actor, reason, replacement, now);
        Touch();
        return true;
    }

    public DocumentVersion AddVersion(
        string storageKey,
        string sha256Hash,
        string mimeType,
        long sizeBytes,
        string createdBy,
        string? reason,
        DateTimeOffset now)
    {
        EnsureMutable();
        return AppendVersion(storageKey, sha256Hash, mimeType, sizeBytes, createdBy, reason, now);
    }

    // An upload accepted before cancellation may finish, but must never reactivate the document.
    public DocumentVersion CompletePendingFileIngestion(string storageKey, string sha256Hash, string mimeType,
        long sizeBytes, string createdBy, string? reason, DateTimeOffset now)
    {
        if (Status != DocumentStatus.Cancelled) EnsureMutable();
        return AppendVersion(storageKey, sha256Hash, mimeType, sizeBytes, createdBy, reason, now);
    }

    private DocumentVersion AppendVersion(string storageKey, string sha256Hash, string mimeType,
        long sizeBytes, string createdBy, string? reason, DateTimeOffset now)
    {
        var version = new DocumentVersion(
            Guid.CreateVersion7(),
            Id,
            _versions.Count + 1,
            storageKey,
            sha256Hash,
            mimeType,
            sizeBytes,
            createdBy,
            reason,
            now);

        _versions.Add(version);
        CurrentVersionNumber = version.VersionNumber;
        Touch();

        return version;
    }

}
