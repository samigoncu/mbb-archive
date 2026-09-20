using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.AccessControl.Application.Grants;
using Mbb.Archive.Modules.AccessControl.Domain.Grants;

namespace Mbb.Archive.Modules.AccessControl.Infrastructure.Persistence;

internal sealed class EfAccessGrantRepository : IAccessGrantRepository, IAccessGrantQueries
{
    private readonly AccessDbContext _db;

    public EfAccessGrantRepository(AccessDbContext db) => _db = db;

    public async Task AddAsync(AccessGrant grant, CancellationToken cancellationToken)
        => await _db.Grants.AddAsync(grant, cancellationToken);

    public Task<AccessGrant?> GetAsync(Guid id, CancellationToken cancellationToken)
        => _db.Grants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<AccessGrant?> FindActiveAsync(
        GrantResourceType resourceType,
        string resourceKey,
        GrantSubjectType subjectType,
        string subjectKey,
        GrantPermission permission,
        CancellationToken cancellationToken)
    {
        var key = Normalize(resourceType, resourceKey);

        return _db.Grants.FirstOrDefaultAsync(
            x => x.ResourceType == resourceType
                && x.ResourceKey == key
                && x.SubjectType == subjectType
                && x.SubjectKey == subjectKey
                && x.Permission == permission
                && x.ValidTo == null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<AccessGrantSummary>> GetForResourceAsync(
        GrantResourceType resourceType,
        string resourceKey,
        CancellationToken cancellationToken)
    {
        var key = Normalize(resourceType, resourceKey);

        return await Project(
                _db.Grants.AsNoTracking()
                    .Where(x => x.ResourceType == resourceType && x.ResourceKey == key))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AccessGrantSummary>> GetForSubjectAsync(
        GrantSubjectIdentity identity,
        CancellationToken cancellationToken)
        => await Project(Matching(identity)).ToListAsync(cancellationToken);

    public async Task<ResolvedGrants> ResolveAsync(
        GrantSubjectIdentity identity,
        DateTimeOffset moment,
        CancellationToken cancellationToken)
    {
        // Süresi geçmiş ya da henüz başlamamış yetki kapsama girmez.
        var active = await Matching(identity)
            .Where(x =>
                (x.ValidFrom == null || x.ValidFrom <= moment)
                && (x.ValidTo == null || x.ValidTo > moment))
            .Select(x => new GrantKey(x.ResourceType, x.ResourceKey))
            .ToListAsync(cancellationToken);

        if (active.Count == 0)
            return ResolvedGrants.None;

        return new ResolvedGrants(
            Guids(active, GrantResourceType.Document),
            active
                .Where(x => x.ResourceType == GrantResourceType.FilePlanItem)
                .Select(x => x.ResourceKey)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            Guids(active, GrantResourceType.Collection),
            Guids(active, GrantResourceType.PhysicalFolder));
    }

    /// <summary>
    /// Öznenin herhangi bir kimliğiyle eşleşen paylaşımlar: sicili, dizin
    /// grupları veya birimlerinden biri.
    /// </summary>
    private IQueryable<AccessGrant> Matching(GrantSubjectIdentity identity)
    {
        var groups = identity.Groups.ToArray();
        var units = identity.UnitIds.Select(x => x.ToString("D")).ToArray();

        return _db.Grants.AsNoTracking().Where(x =>
            (x.SubjectType == GrantSubjectType.User && x.SubjectKey == identity.SubjectId)
            || (x.SubjectType == GrantSubjectType.Group && groups.Contains(x.SubjectKey))
            || (x.SubjectType == GrantSubjectType.OrganizationUnit && units.Contains(x.SubjectKey)));
    }

    private static IQueryable<AccessGrantSummary> Project(IQueryable<AccessGrant> grants)
        => grants
            .OrderByDescending(x => x.ValidTo == null)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new AccessGrantSummary(
                x.Id,
                x.ResourceType.ToString(),
                x.ResourceKey,
                x.SubjectType.ToString(),
                x.SubjectKey,
                x.Permission.ToString(),
                x.ValidFrom,
                x.ValidTo,
                x.ValidTo == null,
                x.GrantedBy,
                x.Reason,
                x.CreatedAt));

    /// <summary>Ayrıştırılamayan anahtar sessizce atlanır; bozuk kayıt kapsam açmaz.</summary>
    private static IReadOnlyList<Guid> Guids(
        IEnumerable<GrantKey> rows,
        GrantResourceType type)
        => rows
            .Where(row => row.ResourceType == type)
            .Select(row => Guid.TryParse(row.ResourceKey, out var parsed) ? parsed : (Guid?)null)
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

    private sealed record GrantKey(GrantResourceType ResourceType, string ResourceKey);

    private static string Normalize(GrantResourceType type, string key)
    {
        var trimmed = key.Trim();

        if (type == GrantResourceType.FilePlanItem)
            return trimmed.ToUpperInvariant();

        return Guid.TryParse(trimmed, out var parsed) ? parsed.ToString("D") : trimmed;
    }
}
