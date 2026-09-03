using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Eyp;

/// <summary>
/// Integration point for the current official .NET EYP 2.1 API.
/// The repository does not impersonate the official validator by duplicating
/// undocumented package rules.
/// </summary>
internal sealed class UnavailableEyp21OfficialValidator
    : IEyp21OfficialValidator
{
    public Task<EypOfficialValidationResult> ValidateAsync(
        Stream content,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            new EypOfficialValidationResult(
                EypOfficialValidationStatus.NotConfigured,
                "Official EYP 2.1 adapter boundary",
                [
                    "Official .NET EYP 2.1 validation API is not connected.",
                    "OPC structural validity must not be reported as EYP 2.1 conformance."
                ]));
    }
}

internal sealed class UnavailableEyp21PackageBuilder
    : IEyp21PackageBuilder
{
    public Task<EypBuildResult> BuildAsync(
        EypBuildRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(
            new EypBuildResult(
                Succeeded: false,
                "Official EYP 2.1 adapter boundary",
                Package: null,
                [
                    "EYP creation/update is disabled until the official .NET API v2.1 adapter is configured."
                ]));
    }
}
