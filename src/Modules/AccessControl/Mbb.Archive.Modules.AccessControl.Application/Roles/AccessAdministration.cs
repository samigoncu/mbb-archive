using System.Security.Cryptography;
using System.Text;
using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.AccessControl.Application.Roles;

public sealed record ManagedRole(Guid Id, string Code, string Name, string[] Permissions, int MemberCount, string Version);
public sealed record ManagedSubject(string SubjectId, Guid[] RoleIds, string[] Permissions, string Version);
public sealed record SubjectPage(IReadOnlyList<ManagedSubject> Items, int TotalCount);

/// <summary>
/// Kullanıcı listesinin sorgusu.
/// </summary>
/// <remarks>
/// <para>
/// <paramref name="Include"/>, rol atanmamış olsa da listede görünmesi gereken
/// kimlikleri taşır: kuruma giriş yapmış ama henüz yetkilendirilmemiş kişiler.
/// Bu kimlikler Organization modülünden, kullanıcı künyesi aramasından gelir —
/// AccessControl kullanıcı künyesi tablosunu okumaz, modül sınırı korunur.
/// </para>
/// <para>
/// <paramref name="Search"/> yalnız kimliğe uygulanır; <paramref name="Include"/>
/// girdileri çağıran tarafta ada göre süzüldüğü için yeniden süzülmez.
/// </para>
/// </remarks>
public sealed record SubjectSearch(string? Search, int Page, string[]? Include, bool OnlyPending);
public sealed record UpdateManagedRole(string Name, string[] Permissions, string ExpectedVersion);
public sealed record UpdateSubjectRoles(Guid[] RoleIds, string ExpectedVersion);
public interface IAccessAdministration
{
    Task<IReadOnlyList<ManagedRole>> RolesAsync(CancellationToken ct);
    Task<SubjectPage> SubjectsAsync(string? search, int page, CancellationToken ct);
    Task<SubjectPage> SubjectsAsync(SubjectSearch request, CancellationToken ct);
    Task<ManagedSubject> SubjectAsync(string subject, CancellationToken ct);
    Task<Result> DeleteRoleAsync(Guid id, string expectedVersion, CancellationToken ct);
    Task<Result> UpdateRoleAsync(Guid id, UpdateManagedRole request, CancellationToken ct);
    Task<Result> UpdateSubjectAsync(string subject, UpdateSubjectRoles request, CancellationToken ct);
}
public static class AccessVersion
{
    public static string Of(IEnumerable<string> values) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("\n", values.Order(StringComparer.Ordinal)))));
}
