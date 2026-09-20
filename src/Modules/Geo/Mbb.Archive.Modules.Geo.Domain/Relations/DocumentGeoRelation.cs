using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Domain.Entities;

namespace Mbb.Archive.Modules.Geo.Domain.Relations;

/// <summary>
/// §8/§9: ilişki serbest etiket değil, tiplidir. Yeni tür eklenmesi şemayı
/// değiştirmeden mümkün olmasın diye enum kullanılır.
/// </summary>
public enum GeoRelationType
{
    /// <summary>Belge bu nesne hakkındadır (UKOME kararı ↔ yol).</summary>
    Subject = 0,

    /// <summary>Belgede geçen ama konusu olmayan nesne.</summary>
    Mentions = 1,

    /// <summary>Kararın uygulama alanı.</summary>
    AffectedArea = 2,

    /// <summary>Belgenin düzenlendiği/çekildiği yer.</summary>
    Location = 3
}

/// <summary>
/// Belge ile coğrafi nesne arasındaki çok-a-çok ilişki. Zaman aralığı taşır:
/// bir kararın yürürlüğü bittiğinde ilişki silinmez, kapatılır.
/// </summary>
public sealed class DocumentGeoRelation : AggregateRoot<Guid>
{
    private DocumentGeoRelation()
    {
    }

    private DocumentGeoRelation(
        Guid id,
        Guid documentId,
        GeoEntityId geoEntityId,
        GeoRelationType relationType,
        DateTimeOffset? validFrom,
        DateTimeOffset? validTo,
        string createdBy,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");

        if (string.IsNullOrWhiteSpace(createdBy))
            throw new DomainRuleViolationException("Creating subject is required.");

        if (validFrom is not null && validTo is not null && validTo < validFrom)
        {
            throw new DomainRuleViolationException(
                "Relation validity end cannot precede its start.");
        }

        DocumentId = documentId;
        GeoEntityId = geoEntityId;
        RelationType = relationType;
        ValidFrom = validFrom;
        ValidTo = validTo;
        CreatedBy = createdBy.Trim();
        CreatedAt = createdAt;
    }

    public Guid DocumentId { get; private set; }
    public GeoEntityId GeoEntityId { get; private set; }
    public GeoRelationType RelationType { get; private set; }
    public DateTimeOffset? ValidFrom { get; private set; }
    public DateTimeOffset? ValidTo { get; private set; }
    public string CreatedBy { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }

    public static DocumentGeoRelation Create(
        Guid documentId,
        GeoEntityId geoEntityId,
        GeoRelationType relationType,
        DateTimeOffset? validFrom,
        DateTimeOffset? validTo,
        string createdBy,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            documentId,
            geoEntityId,
            relationType,
            validFrom,
            validTo,
            createdBy,
            now);

    /// <summary>İlişkiyi kapatır; kaydı silmez, geçmişi korur.</summary>
    public void Close(DateTimeOffset at)
    {
        if (ValidTo is not null)
            return;

        if (ValidFrom is not null && at < ValidFrom)
            throw new DomainRuleViolationException("Relation cannot end before it starts.");

        ValidTo = at;
    }

    public bool IsActiveAt(DateTimeOffset moment)
        => (ValidFrom is null || ValidFrom <= moment)
            && (ValidTo is null || ValidTo > moment);
}
