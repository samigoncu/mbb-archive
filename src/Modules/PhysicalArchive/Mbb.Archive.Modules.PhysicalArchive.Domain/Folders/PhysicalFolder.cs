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

    public string Barcode { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string FilePlanCode { get; private set; } = string.Empty;
    public Guid LocationId { get; private set; }
    public PhysicalFolderStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? LastMovedAt { get; private set; }

    public IReadOnlyCollection<PhysicalFolderDocument> Documents => _documents.AsReadOnly();

    public static PhysicalFolder Register(
        string barcode,
        string title,
        string filePlanCode,
        ArchiveLocation location,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(location);

        if (!location.CanStoreFolder())
            throw new DomainRuleViolationException("Folder can only be stored on an active shelf or box.");

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
    }

    public void MoveTo(ArchiveLocation destination, DateTimeOffset now)
    {
        if (Status == PhysicalFolderStatus.OnLoan)
            throw new DomainRuleViolationException("Folder on loan cannot be moved.");
        if (Status is PhysicalFolderStatus.Transferred or PhysicalFolderStatus.Disposed)
            throw new DomainRuleViolationException("Closed folder cannot be moved.");
        if (!destination.CanStoreFolder())
            throw new DomainRuleViolationException("Destination must be an active shelf or box.");

        LocationId = destination.Id;
        LastMovedAt = now;
    }

    public void CheckOut()
    {
        if (Status != PhysicalFolderStatus.Available)
            throw new DomainRuleViolationException("Only available folder can be checked out.");

        Status = PhysicalFolderStatus.OnLoan;
    }

    public void CheckIn()
    {
        if (Status != PhysicalFolderStatus.OnLoan)
            throw new DomainRuleViolationException("Only a folder on loan can be returned.");

        Status = PhysicalFolderStatus.Available;
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
}
