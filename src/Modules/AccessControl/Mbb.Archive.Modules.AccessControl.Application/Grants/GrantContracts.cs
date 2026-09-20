using Mbb.Archive.Modules.AccessControl.Domain.Grants;

namespace Mbb.Archive.Modules.AccessControl.Application.Grants;

public sealed record AccessGrantSummary(
    Guid Id,
    string ResourceType,
    string ResourceKey,
    string SubjectType,
    string SubjectKey,
    string Permission,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo,
    bool IsActive,
    string GrantedBy,
    string? Reason,
    DateTimeOffset CreatedAt);

/// <summary>
/// Bir öznenin kimlikleri: sicili, dizin grupları/rolleri ve birimleri.
/// Paylaşımlar bu kümenin herhangi biriyle eşleşebilir.
/// </summary>
public sealed record GrantSubjectIdentity(
    string SubjectId,
    IReadOnlyCollection<string> Groups,
    IReadOnlyCollection<Guid> UnitIds);

/// <summary>Kapsam sağlayıcısına dönen, öznenin aktif paylaşımları.</summary>
public sealed record ResolvedGrants(
    IReadOnlyList<Guid> DocumentIds,
    IReadOnlyList<string> FilePlanCodes,
    IReadOnlyList<Guid> CollectionIds,
    IReadOnlyList<Guid> PhysicalFolderIds)
{
    public static readonly ResolvedGrants None = new([], [], [], []);
}

public interface IAccessGrantRepository
{
    Task AddAsync(AccessGrant grant, CancellationToken cancellationToken);

    Task<AccessGrant?> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<AccessGrant?> FindActiveAsync(
        GrantResourceType resourceType,
        string resourceKey,
        GrantSubjectType subjectType,
        string subjectKey,
        GrantPermission permission,
        CancellationToken cancellationToken);
}

public interface IAccessGrantQueries
{
    /// <summary>Bir kaynağa kimlerin erişebildiği; "bu belgeyi kim görüyor" sorusu.</summary>
    Task<IReadOnlyList<AccessGrantSummary>> GetForResourceAsync(
        GrantResourceType resourceType,
        string resourceKey,
        CancellationToken cancellationToken);

    /// <summary>Bir öznenin aldığı paylaşımlar.</summary>
    Task<IReadOnlyList<AccessGrantSummary>> GetForSubjectAsync(
        GrantSubjectIdentity identity,
        CancellationToken cancellationToken);

    /// <summary>
    /// Kapsam hesabı için yalnız aktif paylaşımları çözer. Süresi dolmuş
    /// kayıtlar kapsama girmez ama tabloda kalır.
    /// </summary>
    Task<ResolvedGrants> ResolveAsync(
        GrantSubjectIdentity identity,
        DateTimeOffset moment,
        CancellationToken cancellationToken);
}
