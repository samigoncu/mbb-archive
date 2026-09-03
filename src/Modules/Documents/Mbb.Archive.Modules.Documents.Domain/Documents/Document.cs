using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents.Events;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Domain.Documents;

public sealed class Document : AggregateRoot<DocumentId>
{
    private readonly List<DocumentVersion> _versions = [];

    private Document()
    {
    }

    private Document(DocumentId id, string title, DateTimeOffset createdAt)
        : base(id)
    {
        Title = NormalizeTitle(title);
        Status = DocumentStatus.Draft;
        CreatedAt = createdAt;
        ConcurrencyVersion = 1;

        RaiseDomainEvent(new DocumentCreatedDomainEvent(Id, createdAt));
    }

    public string Title { get; private set; } = string.Empty;
    public DocumentStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ArchivedAt { get; private set; }

    /// <summary>
    /// Uygulama seviyesinde optimistic concurrency kontrolü için artırılan sürüm.
    /// PostgreSQL provider'a özgü xmin davranışına domain modelini bağlamaz.
    /// </summary>
    public long ConcurrencyVersion { get; private set; }

    public IReadOnlyCollection<DocumentVersion> Versions => _versions.AsReadOnly();

    public static Document Create(string title, DateTimeOffset now)
        => new(DocumentId.New(), title, now);

    public void ChangeTitle(string title)
    {
        EnsureMutable();
        Title = NormalizeTitle(title);
        Touch();
    }

    public DocumentFileIngestion BeginFileIngestion(
        string originalFileName,
        string clientContentType,
        long declaredSizeBytes,
        DateTimeOffset now)
    {
        EnsureMutable();

        // Dosya ingestion başlatmak document yaşam döngüsünde anlamlı bir mutation'dır.
        // Version artırımı, uzun süren upload sırasında başka bir kullanıcının belgeyi
        // arşivlemesi halinde SaveChanges aşamasında optimistic concurrency conflict üretir.
        Touch();

        return DocumentFileIngestion.Create(
            DocumentFileIngestionId.New(),
            Id,
            originalFileName,
            clientContentType,
            declaredSizeBytes,
            now);
    }

    public DocumentVersion AddVersion(
        string storageKey,
        string sha256Hash,
        string mimeType,
        long sizeBytes,
        DateTimeOffset now)
    {
        EnsureMutable();

        var version = new DocumentVersion(
            Guid.CreateVersion7(),
            Id,
            _versions.Count + 1,
            storageKey,
            sha256Hash,
            mimeType,
            sizeBytes,
            now);

        _versions.Add(version);
        Touch();

        return version;
    }

    public void Archive(DateTimeOffset now)
    {
        if (Status == DocumentStatus.Archived)
            return;

        if (_versions.Count == 0)
            throw new DomainRuleViolationException("A document without a stored version cannot be archived.");

        // Arşiv statüsü normal çalışma belgesinden değişmez kayıt yaşam döngüsüne geçiştir.
        // Bu nedenle sonraki içerik değişiklikleri yeni/correction record üzerinden yapılmalıdır.
        Status = DocumentStatus.Archived;
        ArchivedAt = now;
        Touch();

        RaiseDomainEvent(new DocumentArchivedDomainEvent(Id, now));
    }

    private void EnsureMutable()
    {
        if (Status == DocumentStatus.Archived)
        {
            throw new DomainRuleViolationException(
                "Archived document cannot be modified. Create a correction or a new record instead.");
        }
    }

    private void Touch()
        => ConcurrencyVersion++;

    private static string NormalizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainRuleViolationException("Document title is required.");

        var normalized = title.Trim();

        if (normalized.Length > 300)
            throw new DomainRuleViolationException("Document title cannot exceed 300 characters.");

        return normalized;
    }
}
