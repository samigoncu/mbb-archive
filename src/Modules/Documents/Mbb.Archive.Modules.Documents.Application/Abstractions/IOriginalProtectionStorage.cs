namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IOriginalProtectionStorage
{
    Task<OriginalProtectionState> InspectAsync(string key, string? versionId, CancellationToken ct);
    Task<OriginalProtectionState> ProtectAsync(string key, string versionId, DateTimeOffset? until,
        bool legalHold, CancellationToken ct);
}

public sealed record OriginalProtectionState(string VersionId, long SizeBytes, string? Sha256,
    DateTimeOffset? RetainUntil, bool LegalHold);
