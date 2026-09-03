using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;

namespace Mbb.Archive.Modules.Classification.Domain.Documents;

public sealed class DocumentClassification : AggregateRoot<DocumentClassificationId>
{
    private DocumentClassification() { }

    private DocumentClassification(
        DocumentClassificationId id,
        Guid documentId,
        FilePlanId filePlanId,
        FilePlanItemId filePlanItemId,
        bool isPrimary,
        DateTimeOffset classifiedAt)
        : base(id)
    {
        if (documentId == Guid.Empty)
            throw new DomainRuleViolationException("Document id is required.");
        DocumentId = documentId;
        FilePlanId = filePlanId;
        FilePlanItemId = filePlanItemId;
        IsPrimary = isPrimary;
        ClassifiedAt = classifiedAt;
    }

    public Guid DocumentId { get; private set; }
    public FilePlanId FilePlanId { get; private set; }
    public FilePlanItemId FilePlanItemId { get; private set; }
    public bool IsPrimary { get; private set; }
    public DateTimeOffset ClassifiedAt { get; private set; }

    public static DocumentClassification Create(
        Guid documentId,
        FilePlanId filePlanId,
        FilePlanItemId filePlanItemId,
        bool isPrimary,
        DateTimeOffset now)
        => new(
            DocumentClassificationId.New(),
            documentId,
            filePlanId,
            filePlanItemId,
            isPrimary,
            now);
}
