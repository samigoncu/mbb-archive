using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;

public enum PhysicalFolderStatus
{
    Available = 0,
    OnLoan = 1,
    Transferred = 2,
    Disposed = 3
}

public sealed class PhysicalFolder : AggregateRoot<Guid>
{
    private readonly List<PhysicalFolderDocument> _documents = [];

    private PhysicalFolder() { }

    private PhysicalFolder(
        Guid id,
        string barcode,
        string title,
        string filePlanCode,
        Guid locationId,
        DateTimeOffset createdAt) : base(id)
    {
        if (string.IsNullOrWhiteSpace(barcode))
            throw new DomainRuleViolationException("Folder barcode is required.");
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainRuleViolationException("Folder title is required.");
        if (string.IsNullOrWhiteSpace(filePlanCode))
            throw new DomainRuleViolationException("File plan code is required.");

        Barcode = barcode.Trim().ToUpperInvariant();
        Title = title.Trim();
        FilePlanCode = filePlanCode.Trim();
        LocationId = locationId;
        Status = PhysicalFolderStatus.Available;
        CreatedAt = createdAt;
    }

    public Guid? OwnerUnitId { get; private set; }
    public Guid? DigitalDossierId { get; private set; }

    public void AssignOwnership(Guid ownerUnitId, Guid? digitalDossierId = null)
    {
        if (ownerUnitId == Guid.Empty)
            throw new DomainRuleViolationException("Sahip birim zorunludur.");
        if (OwnerUnitId is not null && OwnerUnitId != ownerUnitId)
            throw new DomainRuleViolationException("Yer değişikliği dosyanın birim aidiyetini değiştiremez.");
        OwnerUnitId = ownerUnitId;
        DigitalDossierId = digitalDossierId;
    }

    public string Barcode { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string FilePlanCode { get; private set; } = string.Empty;
    public Guid LocationId { get; private set; }
    public PhysicalFolderStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? LastMovedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; } = 1;

    public IReadOnlyCollection<PhysicalFolderDocument> Documents => _documents.AsReadOnly();

    public static PhysicalFolder Register(
        string barcode,
        string title,
        string filePlanCode,
        ArchiveLocation location,
        ArchiveLocationTypeDefinition locationType,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(location);
        ArgumentNullException.ThrowIfNull(locationType);

        if (!location.CanStoreFolder(locationType))
            throw new DomainRuleViolationException($"Klasör yalnız klasör taşıyabilen aktif bir seviyeye konulabilir; {locationType.Name} buna uygun değil.");

        return new(
            Guid.CreateVersion7(),
            barcode,
            title,
            filePlanCode,
            location.Id,
            now);
    }

    public void LinkDocument(Guid documentId, DateTimeOffset linkedAt)
    {
        EnsureFilingAvailable();
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");

        if (_documents.Any(x => x.DocumentId == documentId))
            return;

        _documents.Add(
            new PhysicalFolderDocument(
                Guid.CreateVersion7(),
                Id,
                documentId,
                linkedAt));
        ConcurrencyVersion++;
    }

    public void MoveTo(ArchiveLocation destination, ArchiveLocationTypeDefinition destinationType, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(destinationType);
        if (Status == PhysicalFolderStatus.OnLoan)
            throw new DomainRuleViolationException("Folder on loan cannot be moved.");
        if (Status is PhysicalFolderStatus.Transferred or PhysicalFolderStatus.Disposed)
            throw new DomainRuleViolationException("Closed folder cannot be moved.");
        if (!destination.CanStoreFolder(destinationType))
            throw new DomainRuleViolationException($"Hedef, klasör taşıyabilen aktif bir seviye olmalı; {destinationType.Name} buna uygun değil.");

        LocationId = destination.Id;
        LastMovedAt = now;
        ConcurrencyVersion++;
    }

    public void UnlinkDocument(Guid documentId)
    {
        EnsureFilingAvailable();
        if (_documents.Any(x => x.DocumentId == documentId && x.DisposedAt is not null))
            throw new DomainRuleViolationException("Fiziksel imha kanıtı bulunan belge bağlantısı tarihçe için korunur.");
        _documents.RemoveAll(link => link.DocumentId == documentId);
        ConcurrencyVersion++;
    }

    private void EnsureFilingAvailable()
    {
        if (Status != PhysicalFolderStatus.Available)
            throw new DomainRuleViolationException("Ödünçteki veya kapatılmış fiziksel klasörün belge bağlantıları değiştirilemez.");
    }

    public void CheckOut()
    {
        if (Status != PhysicalFolderStatus.Available)
            throw new DomainRuleViolationException("Only available folder can be checked out.");

        Status = PhysicalFolderStatus.OnLoan;
        ConcurrencyVersion++;
    }

    public void CheckIn()
    {
        if (Status != PhysicalFolderStatus.OnLoan)
            throw new DomainRuleViolationException("Only a folder on loan can be returned.");

        Status = PhysicalFolderStatus.Available;
        ConcurrencyVersion++;
    }

    public void RecordPhysicalDisposition(Guid documentId, Guid processId, string actor, string reference, Guid evidenceDocumentId, DateTimeOffset executedAt)
    {
        var link = _documents.SingleOrDefault(x => x.DocumentId == documentId)
            ?? throw new DomainRuleViolationException("Belge fiziksel klasöre bağlı değil.");
        if (link.DispositionProcessId == processId)
        {
            if (!link.MatchesDisposition(processId, actor, reference, evidenceDocumentId, executedAt))
                throw new DomainRuleViolationException("Aynı fiziksel imha isteğinin kanıt veya gerçekleşme bilgileri değiştirilemez.");
            return;
        }
        EnsureFilingAvailable();
        link.RecordDisposition(processId, actor, reference, evidenceDocumentId, executedAt);
        if (_documents.All(x => x.DisposedAt is not null)) Status = PhysicalFolderStatus.Disposed;
        ConcurrencyVersion++;
    }
}

public sealed class PhysicalFolderDocument : Entity<Guid>
{
    private PhysicalFolderDocument() { }

    internal PhysicalFolderDocument(
        Guid id,
        Guid folderId,
        Guid documentId,
        DateTimeOffset linkedAt) : base(id)
    {
        FolderId = folderId;
        DocumentId = documentId;
        LinkedAt = linkedAt;
    }

    public Guid FolderId { get; private set; }
    public Guid DocumentId { get; private set; }
    public DateTimeOffset LinkedAt { get; private set; }
    public Guid? DispositionProcessId { get; private set; }
    public DateTimeOffset? DisposedAt { get; private set; }
    public string? DisposedBy { get; private set; }
    public string? DispositionReference { get; private set; }
    public Guid? DispositionEvidenceDocumentId { get; private set; }

    public bool MatchesDisposition(Guid processId, string actor, string reference, Guid evidenceId, DateTimeOffset at)
        => DispositionProcessId == processId && DisposedBy == actor && DispositionReference == reference
            && DispositionEvidenceDocumentId == evidenceId && DisposedAt?.UtcTicks / 10 == at.UtcTicks / 10;

    internal void RecordDisposition(Guid processId, string actor, string reference, Guid evidenceId, DateTimeOffset at)
    {
        if (DispositionProcessId is not null || processId == Guid.Empty || evidenceId == Guid.Empty
            || string.IsNullOrWhiteSpace(actor) || string.IsNullOrWhiteSpace(reference))
            throw new DomainRuleViolationException("Geçerli, yinelenmeyen fiziksel imha kaydı gereklidir.");
        DispositionProcessId = processId; DisposedAt = at; DisposedBy = actor;
        DispositionReference = reference; DispositionEvidenceDocumentId = evidenceId;
    }
}
