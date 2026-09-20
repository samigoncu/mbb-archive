using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

/// <summary>Dizinden okunan kullanıcı künyesi.</summary>
public sealed record DirectoryUser(
    string SubjectId,
    string DisplayName,
    string? UnitReference,
    IReadOnlyList<string> Groups,
    bool IsActive = true,
    string? Email = null,
    string? Title = null);

public sealed record DirectoryUnit(
    string DistinguishedName,
    string Name,
    string? ParentDistinguishedName);

public interface IDirectoryClient
{
    bool IsConfigured { get; }

    Task<Result<DirectoryUser>> FindUserAsync(
        string subjectId,
        CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(
        CancellationToken cancellationToken);
}

