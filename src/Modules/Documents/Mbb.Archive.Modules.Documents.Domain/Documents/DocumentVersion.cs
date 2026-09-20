using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Documents.Domain.Documents;

public sealed class DocumentVersion : Entity<Guid>
{
    private DocumentVersion()
    {
    }

    internal DocumentVersion(
        Guid id,
        DocumentId documentId,
        int versionNumber,
        string storageKey,
        string sha256Hash,
        string mimeType,
        long sizeBytes,
        string createdBy,
        string? reason,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (versionNumber <= 0)
            throw new DomainRuleViolationException("Version number must be greater than zero.");

        if (string.IsNullOrWhiteSpace(storageKey))
            throw new DomainRuleViolationException("Storage key is required.");

        if (string.IsNullOrWhiteSpace(sha256Hash) || sha256Hash.Length != 64)
            throw new DomainRuleViolationException("A SHA-256 hash must contain 64 hexadecimal characters.");

        if (string.IsNullOrWhiteSpace(mimeType))
            throw new DomainRuleViolationException("MIME type is required.");

        if (sizeBytes <= 0)
            throw new DomainRuleViolationException("Document file size must be greater than zero.");

        if (string.IsNullOrWhiteSpace(createdBy))
            throw new DomainRuleViolationException("Version author is required.");

        DocumentId = documentId;
        CreatedBy = createdBy.Trim();
        Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        VersionNumber = versionNumber;
        StorageKey = storageKey.Trim();
        Sha256Hash = sha256Hash.ToLowerInvariant();
        MimeType = mimeType.Trim();
        SizeBytes = sizeBytes;
        CreatedAt = createdAt;
    }

    public DocumentId DocumentId { get; private set; }
    public int VersionNumber { get; private set; }
    public string StorageKey { get; private set; } = string.Empty;
    public string? StorageVersionId { get; private set; }
    public DateTimeOffset? ProtectionCheckedAt { get; private set; }
    public DateTimeOffset? ProtectedUntil { get; private set; }
    public bool StorageLegalHold { get; private set; }
    public bool OwnsStorageLegalHold { get; private set; }
    public string? ProtectionError { get; private set; }
    public string Sha256Hash { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }

    /// <summary>§5: sürümü kimin oluşturduğu.</summary>
    public string CreatedBy { get; private set; } = string.Empty;

    /// <summary>§5: düzeltme gerekçesi; ilk sürümde boş olabilir.</summary>
    public string? Reason { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? CancelledAt { get; private set; }
    public string? CancelledBy { get; private set; }
    public string? CancellationReason { get; private set; }
    public Guid? CancellationRequestId { get; private set; }
    public int? ReplacementVersionNumber { get; private set; }

    public void PinStorageVersion(string? versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId)) return;
        if (versionId.Length > 1024 || versionId == "null")
            throw new DomainRuleViolationException("A real storage version identifier is required.");
        if (StorageVersionId is not null && StorageVersionId != versionId)
            throw new DomainRuleViolationException("An archived storage version cannot be replaced.");
        StorageVersionId = versionId;
    }

    public void RecordProtection(DateTimeOffset? until, bool held, bool ownsHold, string? error, DateTimeOffset now)
    {
        ProtectionCheckedAt = now;
        ProtectionError = error;
        if (error is not null) return;
        ProtectedUntil = until;
        StorageLegalHold = held;
        OwnsStorageLegalHold = ownsHold;
    }

    internal void Cancel(Guid requestId, string actor, string reason, int? replacement, DateTimeOffset now)
    {
        CancelledAt = now;
        CancelledBy = actor.Trim();
        CancellationReason = reason.Trim();
        CancellationRequestId = requestId;
        ReplacementVersionNumber = replacement;
    }
}
