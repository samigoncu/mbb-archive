using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Evidence.Domain.Validations;

public enum EvidenceKind
{
    CmsSignature = 0,
    Rfc3161Timestamp = 1,
    PdfPades = 2,
    EypPackage = 3
}

public enum EvidenceValidationStatus
{
    Pending = 0,
    Valid = 1,
    Invalid = 2,
    Indeterminate = 3
}

public sealed class EvidenceValidation : AggregateRoot<Guid>
{
    private EvidenceValidation()
    {
    }

    private EvidenceValidation(
        Guid id,
        Guid? documentId,
        Guid? documentVersionId,
        EvidenceKind kind,
        string contentSha256,
        string profile,
        DateTimeOffset startedAt) : base(id)
    {
        if (string.IsNullOrWhiteSpace(contentSha256) || contentSha256.Length != 64)
            throw new DomainRuleViolationException("Evidence SHA-256 is required.");

        if (string.IsNullOrWhiteSpace(profile))
            throw new DomainRuleViolationException("Validation profile is required.");

        DocumentId = documentId;
        DocumentVersionId = documentVersionId;
        Kind = kind;
        ContentSha256 = contentSha256.ToLowerInvariant();
        Profile = profile.Trim();
        Status = EvidenceValidationStatus.Pending;
        StartedAt = startedAt;
    }

    public Guid? DocumentId { get; private set; }
    public Guid? DocumentVersionId { get; private set; }
    public EvidenceKind Kind { get; private set; }
    public string ContentSha256 { get; private set; } = string.Empty;
    public string Profile { get; private set; } = string.Empty;
    public EvidenceValidationStatus Status { get; private set; }
    public string Provider { get; private set; } = string.Empty;
    public string ReportJson { get; private set; } = "{}";
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    public static EvidenceValidation Start(
        Guid? documentId,
        Guid? documentVersionId,
        EvidenceKind kind,
        string contentSha256,
        string profile,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            documentId,
            documentVersionId,
            kind,
            contentSha256,
            profile,
            now);

    public void Complete(
        EvidenceValidationStatus status,
        string provider,
        string reportJson,
        DateTimeOffset now)
    {
        if (Status != EvidenceValidationStatus.Pending)
            throw new DomainRuleViolationException("Evidence validation is already completed.");

        if (status == EvidenceValidationStatus.Pending)
            throw new DomainRuleViolationException("Completed validation cannot remain pending.");

        if (string.IsNullOrWhiteSpace(provider))
            throw new DomainRuleViolationException("Validation provider is required.");

        if (string.IsNullOrWhiteSpace(reportJson))
            throw new DomainRuleViolationException("Validation report is required.");

        Status = status;
        Provider = provider.Trim();
        ReportJson = reportJson;
        CompletedAt = now;
    }
}
