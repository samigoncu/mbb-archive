using Mbb.Archive.Modules.AccessControl.Domain.Roles;namespace Mbb.Archive.Modules.AccessControl.Application.Abstractions;public interface IAccessRepository{Task<IReadOnlyList<string>> GetAssignedRoleCodesAsync(string subjectId,CancellationToken ct);Task<IReadOnlyList<RoleSummary>> GetRolesAsync(int skip,int take,CancellationToken ct);Task AddRoleAsync(Role role,CancellationToken ct);Task<Role?> GetRoleAsync(Guid id,CancellationToken ct);Task<Role?> GetRoleByCodeAsync(string code,CancellationToken ct);Task AddUserRoleAsync(UserRole userRole,CancellationToken ct);Task<bool> HasPermissionAsync(string subjectId,IReadOnlyCollection<string> externalRoles,string permission,CancellationToken ct);
 /// <summary>Konunun doğrudan ve rol üzerinden devraldığı tüm izinler.</summary>
 Task<IReadOnlyList<string>> GetPermissionsAsync(string subjectId,IReadOnlyCollection<string> externalRoles,CancellationToken ct);}
public interface IPermissionChecker{Task<bool> HasPermissionAsync(string subjectId,IReadOnlyCollection<string> roles,string permission,CancellationToken ct);}

public sealed record RoleSummary(Guid Id, string Code, string Name, IReadOnlyList<string> Permissions);
