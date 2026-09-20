using Mbb.Archive.BuildingBlocks.Domain;
namespace Mbb.Archive.Modules.Documents.Domain.Relations;

public sealed class DocumentRelation
{
    private DocumentRelation() { }
    public Guid Id { get; private set; }
    public Guid SourceDocumentId { get; private set; }
    public Guid TargetDocumentId { get; private set; }
    public string Kind { get; private set; } = "";
    public string Note { get; private set; } = "";
    public string CreatedBy { get; private set; } = "";
    public DateTimeOffset CreatedAt { get; private set; }
    public string ModifiedBy { get; private set; } = "";
    public DateTimeOffset ModifiedAt { get; private set; }
    public DateTimeOffset? RemovedAt { get; private set; }
    public long Version { get; private set; }

    public static DocumentRelation Create(Guid source, Guid target, string kind, string note, string actor, DateTimeOffset now)
    {
        if (source == Guid.Empty || target == Guid.Empty || source == target)
            throw new DomainRuleViolationException("İlişki için farklı iki belge seçin.");
        var relation = new DocumentRelation { Id = Guid.CreateVersion7(), SourceDocumentId = source, TargetDocumentId = target,
            CreatedBy = actor, CreatedAt = now, Version = 0 };
        relation.Change(kind, note, 0, actor, now);
        return relation;
    }
    public void Change(string kind, string note, long expectedVersion, string actor, DateTimeOffset now)
    {
        Check(expectedVersion);
        if (kind is not ("Related" or "Attachment" or "PreviousDecision") || string.IsNullOrWhiteSpace(note) || note.Length > 1000)
            throw new DomainRuleViolationException("İlişki türü ve en fazla 1000 karakter açıklama gerekir.");
        Kind = kind; Note = note.Trim(); ModifiedBy = actor; ModifiedAt = now; Version++;
    }
    public void Remove(long expectedVersion, string actor, DateTimeOffset now)
    {
        Check(expectedVersion); RemovedAt = now; ModifiedBy = actor; ModifiedAt = now; Version++;
    }
    private void Check(long expectedVersion)
    {
        if (RemovedAt is not null || expectedVersion != Version)
            throw new DomainRuleViolationException("İlişki değişmiş veya kaldırılmış. Listeyi yenileyin.");
    }
}
