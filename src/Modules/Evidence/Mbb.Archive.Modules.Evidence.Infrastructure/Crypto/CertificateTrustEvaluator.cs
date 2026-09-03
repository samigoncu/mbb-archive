using System.Security.Cryptography.X509Certificates;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

internal sealed class CertificateTrustEvaluator
{
    public CertificateTrustResult Evaluate(X509Certificate2 certificate)
    {
        using var chain = new X509Chain();

        chain.ChainPolicy.RevocationMode = X509RevocationMode.Online;
        chain.ChainPolicy.RevocationFlag = X509RevocationFlag.EntireChain;
        chain.ChainPolicy.VerificationFlags = X509VerificationFlags.NoFlag;
        chain.ChainPolicy.UrlRetrievalTimeout = TimeSpan.FromSeconds(10);

        var trusted = chain.Build(certificate);

        var statuses = chain.ChainStatus
            .Select(x => $"{x.Status}: {x.StatusInformation.Trim()}")
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return new CertificateTrustResult(
            trusted,
            certificate.Subject,
            certificate.Issuer,
            certificate.Thumbprint ?? string.Empty,
            new DateTimeOffset(certificate.NotBefore.ToUniversalTime()),
            new DateTimeOffset(certificate.NotAfter.ToUniversalTime()),
            statuses);
    }
}
