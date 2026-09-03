using System.Security.Cryptography.Pkcs;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

internal sealed class DotNetRfc3161TimestampValidator
    : IRfc3161TimestampValidator
{
    private readonly CertificateTrustEvaluator _trust;

    public DotNetRfc3161TimestampValidator(
        CertificateTrustEvaluator trust)
    {
        _trust = trust;
    }

    public Task<TimestampValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> encodedToken,
        ReadOnlyMemory<byte> data,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var findings = new List<string>();

        if (!Rfc3161TimestampToken.TryDecode(
                encodedToken,
                out var token,
                out var bytesConsumed)
            || token is null
            || bytesConsumed != encodedToken.Length)
        {
            findings.Add("Input is not one complete RFC 3161 timestamp token.");

            return Task.FromResult(
                Invalid(findings));
        }

        var signatureValid =
            token.VerifySignatureForData(
                data.Span,
                out var tsaCertificate);

        if (!signatureValid || tsaCertificate is null)
        {
            findings.Add(
                "Timestamp signature, TSA certificate requirements, or message imprint validation failed.");

            return Task.FromResult(
                new TimestampValidationResult(
                    EvidenceValidationStatus.Invalid,
                    ".NET Rfc3161TimestampToken",
                    CryptographicValid: false,
                    token.TokenInfo.Timestamp,
                    token.TokenInfo.PolicyId.Value,
                    token.TokenInfo.HashAlgorithmId.Value,
                    null,
                    findings));
        }

        var trust = _trust.Evaluate(tsaCertificate);

        if (!trust.Trusted)
        {
            findings.Add(
                "RFC 3161 token is cryptographically valid, but the TSA chain is not trusted by the current host trust/revocation configuration.");
        }

        return Task.FromResult(
            new TimestampValidationResult(
                trust.Trusted
                    ? EvidenceValidationStatus.Valid
                    : EvidenceValidationStatus.Indeterminate,
                ".NET Rfc3161TimestampToken",
                CryptographicValid: true,
                token.TokenInfo.Timestamp,
                token.TokenInfo.PolicyId.Value,
                token.TokenInfo.HashAlgorithmId.Value,
                trust,
                findings));
    }

    private static TimestampValidationResult Invalid(
        IReadOnlyList<string> findings)
        => new(
            EvidenceValidationStatus.Invalid,
            ".NET Rfc3161TimestampToken",
            CryptographicValid: false,
            null,
            null,
            null,
            null,
            findings);
}
