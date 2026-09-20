using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application.Units;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class ArchiveUnitDirectory(ICurrentUserScope scopeProvider,
    ICurrentUserPermissions permissions, OrganizationQueryHandlers organization) : IArchiveUnitDirectory
{
    private IReadOnlyList<ArchiveUnit>? _units;
    public async Task<IReadOnlyList<ArchiveUnit>> GetVisibleAsync(CancellationToken ct)
    {
        if (_units is not null) return _units;
        var scope = await scopeProvider.GetAsync(ct);
        var tree = await organization.Handle(new GetUnitTreeQuery(IncludeInactive: true), ct);
        if (tree.IsFailure) return _units = [];
        var all = await permissions.HasAllPermissionsAsync(ct);
        var grants = await permissions.GetAsync(ct);
        bool Has(string permission) => all || grants.Contains(permission, StringComparer.OrdinalIgnoreCase);
        return _units = tree.Value
            .Where(u => scope.Unrestricted || scope.UnitPaths.Any(p => u.Path.StartsWith(p, StringComparison.Ordinal)))
            .Select(u => new ArchiveUnit(u.Id, u.Name, u.Path, u.ParentId, u.IsActive,
                u.Id == scope.PrimaryUnitId,
                Has("documents.write") && (Has("documents.manage.all") || scope.UnitPaths.Any(p => u.Path.StartsWith(p, StringComparison.Ordinal))),
                Has("physical-archive.manage") && (Has("physical-archive.manage.all") || scope.UnitPaths.Any(p => u.Path.StartsWith(p, StringComparison.Ordinal)))))
            .ToArray();
    }

    public async Task<ArchiveUnit?> ResolveWritableAsync(Guid? unitId, string globalPermission, CancellationToken ct)
    {
        var scope = await scopeProvider.GetAsync(ct);
        var id = unitId ?? scope.PrimaryUnitId;
        var unit = (await GetVisibleAsync(ct)).FirstOrDefault(u => u.Id == id && u.IsActive);
        if (unit is null) return null;
        var own = scope.UnitPaths.Any(p => unit.Path.StartsWith(p, StringComparison.Ordinal));
        var global = await permissions.HasAllPermissionsAsync(ct)
            || (await permissions.GetAsync(ct)).Contains(globalPermission, StringComparer.OrdinalIgnoreCase);
        return own || global ? unit : null;
    }
}
