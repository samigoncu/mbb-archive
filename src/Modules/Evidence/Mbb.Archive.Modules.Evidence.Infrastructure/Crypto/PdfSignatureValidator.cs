using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

/// <summary>
/// PAdES validation is deliberately behind a provider port. Searching for /ByteRange
/// or /Contents is not signature validation and is therefore not used as a shortcut.
/// </summary>
internal sealed class UnavailablePdfSignatureValidator
    : IPdfSignatureValidator
{
    public Task<PdfSignatureValidationResult> ValidateAsync(
        ReadOnlyMemory<byte> pdf,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            new PdfSignatureValidationResult(
                EvidenceValidationStatus.Indeterminate,
                "PAdES provider boundary",
                ProviderConfigured: false,
                [
                    "A vetted PAdES validation provider is not configured.",
                    "No compliance claim is made from PDF signature marker detection alone."
                ]));
    }
}
