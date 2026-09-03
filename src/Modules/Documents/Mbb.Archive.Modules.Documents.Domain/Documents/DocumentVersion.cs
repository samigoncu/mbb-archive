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

        DocumentId = documentId;
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
    public string Sha256Hash { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
}
