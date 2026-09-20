using Mbb.Archive.BuildingBlocks.Domain;
namespace Mbb.Archive.Modules.Documents.Domain.Documents;

public sealed partial class Document
{
    public DocumentStatus? StatusBeforeCancellation { get; private set; }
    public DateTimeOffset? CancelledAt { get; private set; }
    public string? CancelledBy { get; private set; }
    public string? CancellationReason { get; private set; }
    public Guid? CancellationOperationId { get; private set; }
    public string? CancellationOperationActor { get; private set; }
    public string? CancellationOperationReason { get; private set; }

    public bool SetCancellation(bool cancel, long expectedVersion, Guid requestId, string actor, string reason, DateTimeOffset now)
    {
        if (requestId == Guid.Empty || string.IsNullOrWhiteSpace(actor) || actor.Length > 200
            || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 1000)
            throw new DomainRuleViolationException("İşlem kimliği, kullanıcı ve en fazla 1000 karakterlik gerekçe gerekir.");
        if (CancellationOperationId == requestId)
        {
            if ((Status == DocumentStatus.Cancelled) == cancel && CancellationOperationActor == actor.Trim()
                && CancellationOperationReason == reason.Trim()) return false;
            throw new DomainRuleViolationException("İşlem kimliği başka bir iptal veya geri alma işleminde kullanılmış.");
        }
        if (ConcurrencyVersion != expectedVersion)
            throw new DomainRuleViolationException("Belge değişmiş. Sayfayı yenileyip yeniden deneyin.");
        if (Status == DocumentStatus.Archived)
            throw new DomainRuleViolationException("Arşivlenmiş belge yanlış yükleme işlemiyle iptal edilemez.");
        if ((Status == DocumentStatus.Cancelled) == cancel)
            throw new DomainRuleViolationException(cancel ? "Belge zaten iptal edilmiş." : "Belge iptal edilmiş değil.");
        if (cancel)
        {
            StatusBeforeCancellation = Status;
            Status = DocumentStatus.Cancelled;
            CancelledAt = now; CancelledBy = actor.Trim(); CancellationReason = reason.Trim();
        }
        else Status = StatusBeforeCancellation ?? DocumentStatus.Draft;
        CancellationOperationId = requestId; CancellationOperationActor = actor.Trim(); CancellationOperationReason = reason.Trim();
        Touch();
        return true;
    }

    private void EnsureNotCancelled()
    {
        if (Status == DocumentStatus.Cancelled)
            throw new DomainRuleViolationException("Belge iptal edilmiş. İşlem yapmak için önce iptali geri alın.");
    }
}
