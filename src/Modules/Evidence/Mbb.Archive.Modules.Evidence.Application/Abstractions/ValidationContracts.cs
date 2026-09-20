using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Application.Abstractions;

public interface ICmsSignatureValidator
{
    Task<CmsValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> signature,
        ReadOnlyMemory<byte>? detachedContent,
        CancellationToken cancellationToken);
}

public interface IRfc3161TimestampValidator
{
    Task<TimestampValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> token,
        ReadOnlyMemory<byte> data,
        CancellationToken cancellationToken);
}

public interface IRfc3161TimestampClient
{
    Task<IssuedTimestamp> RequestAsync(
        ReadOnlyMemory<byte> data,
        CancellationToken cancellationToken);
}

public interface IPdfSignatureValidator
{
    bool IsConfigured => false;
    Task<PdfSignatureValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> pdf,
        CancellationToken cancellationToken);
}

public sealed record CertificateTrustResult(
    bool Trusted,
    string Subject,
    string Issuer,
    string Thumbprint,
    DateTimeOffset NotBefore,
    DateTimeOffset NotAfter,
    IReadOnlyList<string> ChainStatus);

public sealed record CmsSignerResult(
    string Subject,
    string Issuer,
    string Thumbprint,
    bool CryptographicValid,
    CertificateTrustResult Trust);

public sealed record CmsValidationResult(
    EvidenceValidationStatus Status,
    string Provider,
    bool CryptographicValid,
    IReadOnlyList<CmsSignerResult> Signers,
    IReadOnlyList<string> Findings);

public sealed record TimestampValidationResult(
    EvidenceValidationStatus Status,
    string Provider,
    bool CryptographicValid,
    DateTimeOffset? Timestamp,
    string? PolicyOid,
    string? HashAlgorithmOid,
    CertificateTrustResult? TsaCertificate,
    IReadOnlyList<string> Findings);

public sealed record PdfSignatureValidationResult(
    EvidenceValidationStatus Status,
    string Provider,
    bool ProviderConfigured,
    IReadOnlyList<string> Findings,
    string? ReportJson = null);

public sealed record IssuedTimestamp(
    byte[] Token,
    DateTimeOffset Timestamp,
    string PolicyOid,
    string HashAlgorithmOid,
    string TsaSubject);
