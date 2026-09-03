using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

internal sealed class DotNetCmsSignatureValidator : ICmsSignatureValidator
{
    private readonly CertificateTrustEvaluator _trust;

    public DotNetCmsSignatureValidator(CertificateTrustEvaluator trust)
    {
        _trust = trust;
    }

    public Task<CmsValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> signature,
        ReadOnlyMemory<byte>? detachedContent,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var findings = new List<string>();
        var signers = new List<CmsSignerResult>();

        try
        {
            var cms = detachedContent is null
                ? new SignedCms()
                : new SignedCms(
                    new ContentInfo(detachedContent.Value.ToArray()),
                    detached: true);

            cms.Decode(signature.ToArray());

            // Cryptographic integrity and certificate trust are separate findings.
            cms.CheckSignature(verifySignatureOnly: true);

            foreach (SignerInfo signer in cms.SignerInfos)
            {
                var certificate = signer.Certificate;

                if (certificate is null)
                {
                    findings.Add("Signer certificate is not embedded or could not be resolved.");
                    continue;
                }

                var trust = _trust.Evaluate(certificate);

                signers.Add(
                    new CmsSignerResult(
                        certificate.Subject,
                        certificate.Issuer,
                        certificate.Thumbprint ?? string.Empty,
                        CryptographicValid: true,
                        trust));
            }

            if (cms.SignerInfos.Count == 0)
            {
                findings.Add("CMS container contains no signer.");
                return Task.FromResult(
                    new CmsValidationResult(
                        EvidenceValidationStatus.Invalid,
                        ".NET SignedCms",
                        CryptographicValid: false,
                        signers,
                        findings));
            }

            var allTrusted =
                signers.Count == cms.SignerInfos.Count
                && signers.All(x => x.Trust.Trusted);

            var status = allTrusted
                ? EvidenceValidationStatus.Valid
                : EvidenceValidationStatus.Indeterminate;

            if (!allTrusted)
            {
                findings.Add(
                    "Cryptographic signature is valid but one or more certificate chains are not trusted by the current host trust/revocation configuration.");
            }

            return Task.FromResult(
                new CmsValidationResult(
                    status,
                    ".NET SignedCms",
                    CryptographicValid: true,
                    signers,
                    findings));
        }
        catch (CryptographicException ex)
        {
            findings.Add(ex.Message);

            return Task.FromResult(
                new CmsValidationResult(
                    EvidenceValidationStatus.Invalid,
                    ".NET SignedCms",
                    CryptographicValid: false,
                    signers,
                    findings));
        }
    }
}
