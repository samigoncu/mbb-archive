using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

public enum EypStructuralStatus
{
    ValidOpc = 0,
    Invalid = 1
}

public enum EypOfficialValidationStatus
{
    NotConfigured = 0,
    Valid = 1,
    Invalid = 2,
    Indeterminate = 3
}

public sealed class EypPackageInspection : AggregateRoot<Guid>
{
    private EypPackageInspection()
    {
    }

    private EypPackageInspection(
        Guid id,
        Guid? documentId,
        Guid? documentVersionId,
        string fileName,
        string packageSha256,
        DateTimeOffset inspectedAt) : base(id)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new DomainRuleViolationException("EYP file name is required.");

        if (string.IsNullOrWhiteSpace(packageSha256) || packageSha256.Length != 64)
            throw new DomainRuleViolationException("EYP SHA-256 is required.");

        DocumentId = documentId;
        DocumentVersionId = documentVersionId;
        FileName = fileName.Trim();
        PackageSha256 = packageSha256.ToLowerInvariant();
        InspectedAt = inspectedAt;
    }

    public Guid? DocumentId { get; private set; }
    public Guid? DocumentVersionId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string PackageSha256 { get; private set; } = string.Empty;
    public int PartCount { get; private set; }
    public int RelationshipCount { get; private set; }
    public EypStructuralStatus StructuralStatus { get; private set; }
    public EypOfficialValidationStatus OfficialValidationStatus { get; private set; }
    public string StructuralReportJson { get; private set; } = "{}";
    public string OfficialReportJson { get; private set; } = "{}";
    public DateTimeOffset InspectedAt { get; private set; }

    public static EypPackageInspection Create(
        Guid? documentId,
        Guid? documentVersionId,
        string fileName,
        string packageSha256,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            documentId,
            documentVersionId,
            fileName,
            packageSha256,
            now);

    public void ApplyResults(
        int partCount,
        int relationshipCount,
        EypStructuralStatus structuralStatus,
        EypOfficialValidationStatus officialStatus,
        string structuralReportJson,
        string officialReportJson)
    {
        if (partCount < 0 || relationshipCount < 0)
            throw new DomainRuleViolationException("EYP counters cannot be negative.");

        PartCount = partCount;
        RelationshipCount = relationshipCount;
        StructuralStatus = structuralStatus;
        OfficialValidationStatus = officialStatus;
        StructuralReportJson = structuralReportJson;
        OfficialReportJson = officialReportJson;
    }
}
