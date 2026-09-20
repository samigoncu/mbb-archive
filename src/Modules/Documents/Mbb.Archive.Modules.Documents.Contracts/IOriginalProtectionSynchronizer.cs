namespace Mbb.Archive.Modules.Documents.Contracts;

public interface IOriginalProtectionSynchronizer
{
    Task<ProtectionSyncResult> SynchronizeAsync(IReadOnlyList<DocumentProtectionRequirement> requirements,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<OriginalProtectionStatus>> GetStatusAsync(Guid documentId, CancellationToken cancellationToken);
}

public sealed record DocumentProtectionRequirement(Guid DocumentId, DateTimeOffset? RetainUntil, bool LegalHold, bool Permanent);
public sealed record ProtectionSyncResult(bool ProviderSupported, int Checked, int Protected, int Failed);
public sealed record OriginalProtectionStatus(Guid VersionId, int VersionNumber, string? StorageVersionId,
    DateTimeOffset? CheckedAt, DateTimeOffset? RetainUntil, bool LegalHold, string? Error);
