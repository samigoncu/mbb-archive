using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.AccessControl.Application.Roles;
using Mbb.Archive.Modules.AccessControl.Domain.Roles;
namespace Mbb.Archive.Modules.AccessControl.Infrastructure.Persistence;

internal sealed class EfAccessAdministration(AccessDbContext db) : IAccessAdministration
{
    private static string Version(Role role) => AccessVersion.Of(role.Permissions.Select(p => "permission:" + p.Permission).Append("name:" + role.Name));
    public async Task<IReadOnlyList<ManagedRole>> RolesAsync(CancellationToken ct)
    {
        var roles = await db.Roles.AsNoTracking().Include(r => r.Permissions).OrderBy(r => r.Name).ToListAsync(ct);
        var counts = await db.UserRoles.GroupBy(r => r.RoleId).Select(g => new { Id = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count, ct);
        return roles.Select(r => new ManagedRole(r.Id, r.Code, r.Name, r.Permissions.Select(p => p.Permission).Order().ToArray(), counts.GetValueOrDefault(r.Id), Version(r))).ToArray();
    }
    public async Task<ManagedSubject> SubjectAsync(string subject, CancellationToken ct)
    {
        var roles = await db.UserRoles.AsNoTracking().Where(r => r.SubjectId == subject).Select(r => r.RoleId).OrderBy(r => r).ToArrayAsync(ct);
        var permissions = await db.Roles.AsNoTracking().Where(r => roles.Contains(r.Id)).SelectMany(r => r.Permissions.Select(p => p.Permission)).Distinct().OrderBy(p => p).ToArrayAsync(ct);
        return new(subject, roles, permissions, AccessVersion.Of(roles.Select(r => r.ToString())));
    }
    public Task<SubjectPage> SubjectsAsync(string? search, int page, CancellationToken ct)
        => SubjectsAsync(new SubjectSearch(search, page, null, false), ct);

    public async Task<SubjectPage> SubjectsAsync(SubjectSearch request, CancellationToken ct)
    {
        var include = (request.Include ?? [])
            .Select(x => x?.Trim() ?? "")
            .Where(x => x.Length is > 0 and <= 300)
            .Distinct(StringComparer.Ordinal)
            .Take(20000)
            .ToArray();

        // Rol atanmış kimlikler: tek sütun, kullanıcı sayısı kadar satır.
        var assigned = await db.UserRoles.AsNoTracking().Select(r => r.SubjectId).Distinct().ToListAsync(ct);

        var matching = string.IsNullOrWhiteSpace(request.Search)
            ? assigned
            : assigned.Where(s => s.Contains(request.Search, StringComparison.OrdinalIgnoreCase)).ToList();

        // "Erişim bekleyen": künyesi olan ama hiç rolü olmayan kişi.
        var pool = request.OnlyPending
            ? include.Except(assigned, StringComparer.Ordinal)
            : matching.Union(include, StringComparer.Ordinal);

        var ordered = pool.Order(StringComparer.OrdinalIgnoreCase).ToArray();
        var ids = ordered.Skip((Math.Clamp(request.Page, 1, 10000) - 1) * 25).Take(25).ToArray();

        // Sayfadaki kimlikler tek sorguda çözülür. Satır başına SubjectAsync
        // çağrılırken sayfa başına ~50 gidiş dönüş oluyordu.
        var grants = await db.UserRoles.AsNoTracking()
            .Where(r => ids.Contains(r.SubjectId))
            .Select(r => new { r.SubjectId, r.RoleId })
            .ToListAsync(ct);

        var roleIds = grants.Select(x => x.RoleId).Distinct().ToArray();
        var rolePermissions = await db.Roles.AsNoTracking()
            .Where(r => roleIds.Contains(r.Id))
            .Select(r => new { r.Id, Permissions = r.Permissions.Select(p => p.Permission).ToArray() })
            .ToDictionaryAsync(x => x.Id, x => x.Permissions, ct);

        var bySubject = grants
            .GroupBy(x => x.SubjectId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Select(x => x.RoleId).Order().ToArray(), StringComparer.Ordinal);

        var items = ids
            .Select(id =>
            {
                var roles = bySubject.GetValueOrDefault(id, []);
                var permissions = roles
                    .SelectMany(role => rolePermissions.GetValueOrDefault(role, []))
                    .Distinct(StringComparer.Ordinal)
                    // Sıralama kültürden bağımsız olmalı: izin listesi sürüm
                    // damgasına girer, makineye göre değişmemeli.
                    .Order(StringComparer.Ordinal)
                    .ToArray();

                return new ManagedSubject(id, roles, permissions,
                    AccessVersion.Of(roles.Select(role => role.ToString())));
            })
            .ToList();

        return new(items, ordered.Length);
    }
    public async Task<Result> DeleteRoleAsync(Guid id, string expectedVersion, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("LOCK TABLE access.roles, access.user_roles, access.role_permissions IN SHARE ROW EXCLUSIVE MODE", ct);
        var role = await db.Roles.Include(r => r.Permissions).SingleOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return Result.Failure(Error.NotFound("access.role_not_found", "Rol bulunamadı."));
        if (Version(role) != expectedVersion) return Result.Failure(Error.Conflict("access.stale_role", "Rol değiştirildi. Sayfayı yenileyin."));
        if (await db.UserRoles.AnyAsync(r => r.RoleId == id, ct)) return Result.Failure(Error.Conflict("access.role_in_use", "Önce bu rolün kullanıcı atamalarını kaldırın."));
        db.Roles.Remove(role);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Result.Success();
    }
    public async Task<Result> UpdateRoleAsync(Guid id, UpdateManagedRole request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 300 || request.Permissions is null || request.Permissions.Length > 1000)
            return Result.Failure(Error.Validation("access.invalid_role", "Rol adı ve izin listesi geçerli olmalıdır."));
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Serialize all administrative permission/assignment writers, including legacy endpoints.
        await db.Database.ExecuteSqlRawAsync("LOCK TABLE access.roles, access.user_roles, access.role_permissions IN SHARE ROW EXCLUSIVE MODE", ct);
        var role = await db.Roles.Include(r => r.Permissions).SingleOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return Result.Failure(Error.NotFound("access.role_not_found", "Rol bulunamadı."));
        if (Version(role) != request.ExpectedVersion) return Result.Failure(Error.Conflict("access.stale_role", "Rol başka bir işlemde değiştirildi. Sayfayı yenileyin."));
        var desired = request.Permissions.Select(p => (p ?? "").Trim().ToLowerInvariant()).Distinct().ToArray();
        if (desired.Any(p => !PermissionCatalog.Codes.Contains(p) && !role.Permissions.Any(old => old.Permission == p)))
            return Result.Failure(Error.Validation("access.unknown_permission", "Tanınmayan işlem izni seçildi."));
        role.Rename(request.Name);
        role.ReplacePermissions(desired);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Result.Success();
    }
    public async Task<Result> UpdateSubjectAsync(string subject, UpdateSubjectRoles request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 300 || subject.Any(char.IsControl) || request.RoleIds is null || request.RoleIds.Length > 1000)
            return Result.Failure(Error.Validation("access.invalid_subject", "Kullanıcı kimliği ve rol listesi geçerli olmalıdır."));
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("LOCK TABLE access.roles, access.user_roles, access.role_permissions IN SHARE ROW EXCLUSIVE MODE", ct);
        var existing = await db.UserRoles.Where(r => r.SubjectId == subject).ToListAsync(ct);
        if (AccessVersion.Of(existing.Select(r => r.RoleId.ToString())) != request.ExpectedVersion)
            return Result.Failure(Error.Conflict("access.stale_subject", "Kullanıcının rolleri değiştirildi. Sayfayı yenileyin."));
        var desired = request.RoleIds.Distinct().ToArray();
        if (await db.Roles.CountAsync(r => desired.Contains(r.Id), ct) != desired.Length)
            return Result.Failure(Error.Validation("access.unknown_role", "Seçilen rollerden biri bulunamadı."));
        db.UserRoles.RemoveRange(existing.Where(r => !desired.Contains(r.RoleId)));
        foreach (var id in desired.Where(id => existing.All(r => r.RoleId != id))) db.UserRoles.Add(UserRole.Assign(subject, id));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Result.Success();
    }
}
