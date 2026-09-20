namespace Mbb.Archive.Modules.Retention.Contracts;

/// <summary>System worker contract; no user filtering. Physical disposition never removes digital protection.</summary>
public interface IRetentionProtectionSource
{
    Task<IReadOnlyList<RetentionProtectionRequirement>> ListAsync(CancellationToken cancellationToken);
}

public sealed record RetentionProtectionRequirement(Guid DocumentId, DateTimeOffset? RetainUntil,
    bool LegalHold, bool Permanent);
