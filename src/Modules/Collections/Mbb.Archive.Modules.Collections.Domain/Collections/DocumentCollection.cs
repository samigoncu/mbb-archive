using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Collections.Domain.Collections;

public readonly record struct DocumentCollectionId(Guid Value)
{
    public static DocumentCollectionId New() => new(Guid.CreateVersion7());
}

/// <summary>
/// Sanal koleksiyon. Belge fiziksel klasöründen taşınmaz ve kopyalanmaz;
/// koleksiyon yalnızca belgeye işaret eder (§20). Aynı belge birden fazla
/// koleksiyonda bulunabilir.
/// </summary>
public sealed class DocumentCollection : AggregateRoot<DocumentCollectionId>
{
    private readonly List<DocumentCollectionItem> _items = [];

    private DocumentCollection()
    {
    }

    private DocumentCollection(
        DocumentCollectionId id,
        string name,
        string? description,
        string ownerSubject,
        bool isShared,
        DateTimeOffset createdAt)
        : base(id)
    {
        Name = NormalizeName(name);
        Description = NormalizeDescription(description);
        OwnerSubject = NormalizeOwner(ownerSubject);
        IsShared = isShared;
        CreatedAt = createdAt;
        ConcurrencyVersion = 1;
    }

    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    /// <summary>Koleksiyonu oluşturan özne; paylaşılmayan koleksiyonları yalnız o görür.</summary>
    public string OwnerSubject { get; private set; } = string.Empty;

    public bool IsShared { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public IReadOnlyCollection<DocumentCollectionItem> Items => _items.AsReadOnly();

    public static DocumentCollection Create(
        string name,
        string? description,
        string ownerSubject,
        bool isShared,
        DateTimeOffset now)
        => new(
            DocumentCollectionId.New(),
            name,
            description,
            ownerSubject,
            isShared,
            now);

    public void Rename(string name, string? description)
    {
        Name = NormalizeName(name);
        Description = NormalizeDescription(description);
        ConcurrencyVersion++;
    }

    public void ChangeSharing(bool isShared)
    {
        if (IsShared == isShared)
            return;

        IsShared = isShared;
        ConcurrencyVersion++;
    }

    /// <summary>
    /// Aynı belge iki kez eklenemez; ikinci ekleme sessizce yok sayılır ve
    /// kopya satır oluşmaz (§20).
    /// </summary>
    public DocumentCollectionItem? AddDocument(
        Guid documentId,
        string addedBy,
        DateTimeOffset now)
    {
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");

        if (_items.Any(x => x.DocumentId == documentId))
            return null;

        var item = new DocumentCollectionItem(
            Guid.CreateVersion7(),
            Id,
            documentId,
            NormalizeOwner(addedBy),
            now);

        _items.Add(item);
        ConcurrencyVersion++;

        return item;
    }

    /// <summary>
    /// Koleksiyondan çıkarmak belgeyi silmez; yalnızca bu sanal gruplamadan
    /// koparır.
    /// </summary>
    public bool RemoveDocument(Guid documentId)
    {
        var item = _items.SingleOrDefault(x => x.DocumentId == documentId);

        if (item is null)
            return false;

        _items.Remove(item);
        ConcurrencyVersion++;

        return true;
    }

    private static string NormalizeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Collection name is required.");

        var trimmed = name.Trim();

        if (trimmed.Length > 200)
            throw new DomainRuleViolationException("Collection name cannot exceed 200 characters.");

        return trimmed;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;

        var trimmed = description.Trim();

        if (trimmed.Length > 1000)
            throw new DomainRuleViolationException("Collection description cannot exceed 1000 characters.");

        return trimmed;
    }

    private static string NormalizeOwner(string subject)
    {
        if (string.IsNullOrWhiteSpace(subject))
            throw new DomainRuleViolationException("Owner subject is required.");

        return subject.Trim();
    }
}

public sealed class DocumentCollectionItem : Entity<Guid>
{
    private DocumentCollectionItem()
    {
    }

    internal DocumentCollectionItem(
        Guid id,
        DocumentCollectionId collectionId,
        Guid documentId,
        string addedBy,
        DateTimeOffset addedAt)
        : base(id)
    {
        CollectionId = collectionId;
        DocumentId = documentId;
        AddedBy = addedBy;
        AddedAt = addedAt;
    }

    public DocumentCollectionId CollectionId { get; private set; }
    public Guid DocumentId { get; private set; }
    public string AddedBy { get; private set; } = string.Empty;
    public DateTimeOffset AddedAt { get; private set; }
}
