using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;

public interface IEypPackageContent
{
    string FileName { get; }

    Task<Stream> OpenReadAsync(
        CancellationToken cancellationToken);
}

public interface IEypStructuralInspector
{
    Task<EypStructuralInspectionResult> InspectAsync(
        Stream content,
        CancellationToken cancellationToken);
}

public interface IEyp21OfficialValidator
{
    Task<EypOfficialValidationResult> ValidateAsync(
        Stream content,
        CancellationToken cancellationToken);
}

/// <summary>
/// Creation/update deliberately remains behind the official API boundary.
/// Implementations must wrap a verified EYP 2.1 library/API rather than reimplement
/// package semantics from memory.
/// </summary>
public interface IEyp21PackageBuilder
{
    Task<EypBuildResult> BuildAsync(
        EypBuildRequest request,
        CancellationToken cancellationToken);
}

public sealed record EypStructuralInspectionResult(
    EypStructuralStatus Status,
    int PartCount,
    int RelationshipCount,
    long TotalUncompressedBytes,
    IReadOnlyDictionary<string, int> ContentTypes,
    IReadOnlyList<string> Findings);

public sealed record EypOfficialValidationResult(
    EypOfficialValidationStatus Status,
    string Provider,
    IReadOnlyList<string> Findings);

public sealed record EypBuildRequest(
    string OutputFileName,
    Stream UpperDocument,
    IReadOnlyList<EypAttachmentInput> Attachments,
    IReadOnlyDictionary<string, string> Metadata);

public sealed record EypAttachmentInput(
    string FileName,
    string ContentType,
    Stream Content);

public sealed record EypBuildResult(
    bool Succeeded,
    string Provider,
    Stream? Package,
    IReadOnlyList<string> Findings);
