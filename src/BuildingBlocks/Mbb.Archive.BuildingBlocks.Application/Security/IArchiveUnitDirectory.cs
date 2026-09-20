namespace Mbb.Archive.BuildingBlocks.Application.Security;

// Host resolves organization data; archive modules never read organization tables.
public interface IArchiveUnitDirectory
{
    Task<IReadOnlyList<ArchiveUnit>> GetVisibleAsync(CancellationToken ct);
    Task<ArchiveUnit?> ResolveWritableAsync(Guid? unitId, string globalPermission, CancellationToken ct);
}

public sealed record ArchiveUnit(Guid Id, string Name, string Path, Guid? ParentId,
    bool IsActive, bool IsPrimary, bool CanManageDocuments, bool CanManagePhysical);
