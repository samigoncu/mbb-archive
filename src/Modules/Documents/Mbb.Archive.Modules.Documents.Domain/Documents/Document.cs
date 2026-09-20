using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents.Events;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Domain.Documents;

public sealed partial class Document : AggregateRoot<DocumentId>
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
    public int? CurrentVersionNumber { get; private set; }

    /// <summary>Belgeyi sahiplenen kurumsal birim; kapsam süzgecinin dayanağı.</summary>
    public Guid? OwnerUnitId { get; private set; }

    /// <summary>
    /// Sahibi birimin materyalize yolu (<c>/GS/BID/BID-YAZ/</c>). Organization
    /// tablosuna JOIN atmamak için denormalize tutulur; birim taşındığında
    /// yayınlanan olayla tazelenir (§0.8 modüller arası tablo bağımlılığı yok).
    /// </summary>
    public string? OwnerUnitPath { get; private set; }

    /// <summary>
    /// Birincil dosya planı kalem kodu. Classification modülünden gelen olayla
    /// doldurulur; dosya planı dalı üzerinden verilen paylaşımların süzgeçte
    /// çalışabilmesi için burada denormalize tutulur (§0.8: modüller arası
    /// tablo bağımlılığı kurulmaz).
    /// </summary>
    public string? FilePlanCode { get; private set; }
    public Guid? DossierId { get; private set; }

    public void FileIn(Dossiers.DigitalDossier dossier)
    {
        EnsureNotCancelled();
        if (OwnerUnitId != dossier.OwnerUnitId)
            throw new DomainRuleViolationException("Belge ve dijital dosya aynı birime ait olmalıdır.");
        if (FilePlanCode is not null && FilePlanCode != dossier.FilePlanCode)
            throw new DomainRuleViolationException("Belgenin sınıflandırması dosya planıyla uyuşmuyor.");
        if (DossierId is not null && DossierId != dossier.Id)
            throw new DomainRuleViolationException("Belge zaten başka bir dijital dosyada. Fiziksel bağlantılarıyla birlikte kontrollü taşıma gerekir.");
        DossierId = dossier.Id;
        Touch();
    }

    public IReadOnlyCollection<DocumentVersion> Versions => _versions.AsReadOnly();

    // Filing metadata may change on archived documents; original versions stay intact.
    public void Refile(Dossiers.DigitalDossier? dossier, string filePlanCode, long expectedVersion)
    {
        EnsureNotCancelled();
        if (ConcurrencyVersion != expectedVersion)
            throw new DomainRuleViolationException("Belge değişmiş. Sayfayı yenileyip yeniden deneyin.");
        if (string.IsNullOrWhiteSpace(filePlanCode))
            throw new DomainRuleViolationException("Standart dosya planı seçilmelidir.");
        if (dossier is not null && (OwnerUnitId != dossier.OwnerUnitId || filePlanCode != dossier.FilePlanCode))
            throw new DomainRuleViolationException("Dijital dosya belgenin birimi ve SDP konusu ile eşleşmelidir.");
        DossierId = dossier?.Id;
        FilePlanCode = filePlanCode.Trim();
        Touch();
    }

    public static Document Create(string title, DateTimeOffset now)
        => new(DocumentId.New(), title, now);

    /// <summary>
    /// Belgeyi bir birime bağlar. Yükleme sırasında yükleyenin birincil
    /// biriminden doldurulur; sonradan yalnız yetkili taşıyabilir.
    /// </summary>
    public void AssignOwnerUnit(Guid unitId, string unitPath)
    {
        EnsureMutable();

        if (unitId == Guid.Empty)
            throw new DomainRuleViolationException("Owner unit id is required.");

        if (string.IsNullOrWhiteSpace(unitPath))
            throw new DomainRuleViolationException("Owner unit path is required.");

        if (DossierId is not null && OwnerUnitId != unitId)
            throw new DomainRuleViolationException("Dosyalanmış belgenin birimi bağımsız değiştirilemez.");
        OwnerUnitId = unitId;
        OwnerUnitPath = unitPath.Trim();
        Touch();
    }

    /// <summary>
    /// Birim ağacı taşındığında yolu tazeler. Arşivlenmiş belgede de çalışır:
    /// bu bir içerik değişikliği değil, aynı birimin yeni adresidir.
    /// </summary>
    public void RefreshOwnerUnitPath(string unitPath)
    {
        if (OwnerUnitId is null || string.IsNullOrWhiteSpace(unitPath))
            return;

        if (string.Equals(OwnerUnitPath, unitPath, StringComparison.Ordinal))
            return;

        OwnerUnitPath = unitPath.Trim();
        ConcurrencyVersion++;
    }

    /// <summary>
    /// Birincil sınıflandırmayı yansıtır. Arşivlenmiş belgede de çalışır:
    /// içerik değişmez, yalnız kaydın dosya planındaki yeri güncellenir.
    /// </summary>
    public void SetFilePlanCode(string? filePlanCode)
    {
        var normalized = string.IsNullOrWhiteSpace(filePlanCode)
            ? null
            : filePlanCode.Trim().ToUpperInvariant();

        if (string.Equals(FilePlanCode, normalized, StringComparison.Ordinal))
            return;

        FilePlanCode = normalized;
        ConcurrencyVersion++;
    }

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
        string submittedBy,
        string? versionReason,
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
            submittedBy,
            versionReason,
            now);
    }

    public void Archive(DateTimeOffset now)
    {
        EnsureNotCancelled();
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
        EnsureNotCancelled();
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
