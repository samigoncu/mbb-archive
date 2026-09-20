using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Domain.Ingestions;

public sealed class DocumentFileIngestion : AggregateRoot<DocumentFileIngestionId>
{
    private DocumentFileIngestion()
    {
    }

    private DocumentFileIngestion(
        DocumentFileIngestionId id,
        DocumentId documentId,
        string originalFileName,
        string clientContentType,
        long declaredSizeBytes,
        string submittedBy,
        string? versionReason,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(originalFileName))
            throw new DomainRuleViolationException("Original file name is required.");

        if (originalFileName.Length > 500)
            throw new DomainRuleViolationException("Original file name cannot exceed 500 characters.");

        if (string.IsNullOrWhiteSpace(clientContentType))
            throw new DomainRuleViolationException("Client content type is required.");

        if (declaredSizeBytes <= 0)
            throw new DomainRuleViolationException("Declared file size must be greater than zero.");

        if (string.IsNullOrWhiteSpace(submittedBy))
            throw new DomainRuleViolationException("Submitting subject is required.");

        if (versionReason is { Length: > 1000 })
            throw new DomainRuleViolationException("Version reason cannot exceed 1000 characters.");

        DocumentId = documentId;
        SubmittedBy = submittedBy.Trim();
        VersionReason = string.IsNullOrWhiteSpace(versionReason)
            ? null
            : versionReason.Trim();
        OriginalFileName = originalFileName.Trim();
        ClientContentType = clientContentType.Trim();
        DeclaredSizeBytes = declaredSizeBytes;
        CreatedAt = createdAt;
        Status = DocumentFileIngestionStatus.Created;
        ConcurrencyVersion = 1;
    }

    public DocumentId DocumentId { get; private set; }

    /// <summary>§5 gereği sürümü kimin yüklediği kaydedilir.</summary>
    public string SubmittedBy { get; private set; } = string.Empty;

    /// <summary>§5 gereği düzeltme gerekçesi; ilk sürümde boş olabilir.</summary>
    public string? VersionReason { get; private set; }

    public string OriginalFileName { get; private set; } = string.Empty;

    /// <summary>
    /// Kullanıcı/istemci tarafından gönderilen MIME bilgisidir ve güvenilir değildir.
    /// Gerçek içerik tipi security/normalization worker tarafından belirlenecektir.
    /// </summary>
    public string ClientContentType { get; private set; } = string.Empty;

    public long DeclaredSizeBytes { get; private set; }
    public string? StagingStorageKey { get; private set; }
    public string? Sha256Hash { get; private set; }
    public long? StoredSizeBytes { get; private set; }
    public string? DetectedMimeType { get; private set; }
    public string? SecurityScanner { get; private set; }
    public DateTimeOffset? SecurityScannedAt { get; private set; }
    public string? RejectionCode { get; private set; }
    public string? RejectionDetail { get; private set; }
    public string? OriginalStorageKey { get; private set; }
    public DateTimeOffset? OriginalStoredAt { get; private set; }
    public DocumentFileIngestionStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? StagedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    internal static DocumentFileIngestion Create(
        DocumentFileIngestionId id,
        DocumentId documentId,
        string originalFileName,
        string clientContentType,
        long declaredSizeBytes,
        string submittedBy,
        string? versionReason,
        DateTimeOffset now)
        => new(
            id,
            documentId,
            originalFileName,
            clientContentType,
            declaredSizeBytes,
            submittedBy,
            versionReason,
            now);



    public void MarkAccepted(
        string originalStorageKey,
        DateTimeOffset storedAt)
    {
        if (Status == DocumentFileIngestionStatus.Accepted)
            return;

        if (Status != DocumentFileIngestionStatus.SecurityApproved)
        {
            throw new DomainRuleViolationException(
                "Only a security-approved ingestion can be promoted to original storage.");
        }

        if (string.IsNullOrWhiteSpace(originalStorageKey))
            throw new DomainRuleViolationException("Original storage key is required.");

        OriginalStorageKey = originalStorageKey.Trim();
        OriginalStoredAt = storedAt;
        Status = DocumentFileIngestionStatus.Accepted;
        ConcurrencyVersion++;
    }

    public void MarkSecurityApproved(
        string detectedMimeType,
        string scanner,
        DateTimeOffset scannedAt)
    {
        if (Status == DocumentFileIngestionStatus.SecurityApproved)
            return;

        if (Status != DocumentFileIngestionStatus.PendingSecurityScan)
        {
            throw new DomainRuleViolationException(
                "Only a pending security scan can be approved.");
        }

        if (string.IsNullOrWhiteSpace(detectedMimeType))
            throw new DomainRuleViolationException("Detected MIME type is required.");

        if (string.IsNullOrWhiteSpace(scanner))
            throw new DomainRuleViolationException("Security scanner identity is required.");

        DetectedMimeType = detectedMimeType.Trim();
        SecurityScanner = scanner.Trim();
        SecurityScannedAt = scannedAt;
        Status = DocumentFileIngestionStatus.SecurityApproved;
        ConcurrencyVersion++;
    }

    public void RejectSecurityScan(
        string reasonCode,
        string detail,
        string? detectedMimeType,
        DateTimeOffset scannedAt)
    {
        if (Status == DocumentFileIngestionStatus.Rejected)
            return;

        if (Status != DocumentFileIngestionStatus.PendingSecurityScan)
        {
            throw new DomainRuleViolationException(
                "Only a pending security scan can be rejected.");
        }

        if (string.IsNullOrWhiteSpace(reasonCode))
            throw new DomainRuleViolationException("Security rejection reason is required.");

        RejectionCode = reasonCode.Trim();
        RejectionDetail = string.IsNullOrWhiteSpace(detail)
            ? null
            : detail.Trim();
        DetectedMimeType = string.IsNullOrWhiteSpace(detectedMimeType)
            ? null
            : detectedMimeType.Trim();
        SecurityScannedAt = scannedAt;
        Status = DocumentFileIngestionStatus.Rejected;
        ConcurrencyVersion++;
    }

    public void MarkStaged(
        string storageKey,
        string sha256Hash,
        long storedSizeBytes,
        DateTimeOffset now)
    {
        if (Status != DocumentFileIngestionStatus.Created)
            throw new DomainRuleViolationException("Only a newly created ingestion can be staged.");

        if (string.IsNullOrWhiteSpace(storageKey))
            throw new DomainRuleViolationException("Staging storage key is required.");

        if (string.IsNullOrWhiteSpace(sha256Hash) || sha256Hash.Length != 64)
            throw new DomainRuleViolationException("A SHA-256 hash must contain 64 hexadecimal characters.");

        if (storedSizeBytes <= 0)
            throw new DomainRuleViolationException("Stored file size must be greater than zero.");

        StagingStorageKey = storageKey.Trim();
        Sha256Hash = sha256Hash.ToLowerInvariant();
        StoredSizeBytes = storedSizeBytes;
        StagedAt = now;
        Status = DocumentFileIngestionStatus.PendingSecurityScan;
        ConcurrencyVersion++;
    }
}
