using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

internal sealed class EfOrganizationRepository : IOrganizationRepository, IOrganizationQueries
{
    private readonly OrganizationDbContext _db;

    public EfOrganizationRepository(OrganizationDbContext db) => _db = db;

    public async Task AddUnitAsync(OrganizationUnit unit, CancellationToken cancellationToken)
        => await _db.Units.AddAsync(unit, cancellationToken);

    public Task<OrganizationUnit?> GetUnitAsync(
        OrganizationUnitId id,
        CancellationToken cancellationToken)
        => _db.Units.SingleOrDefaultAsync(x => x.Id == id && !x.IsRemoved, cancellationToken);

    public Task<OrganizationUnit?> FindUnitByCodeAsync(
        string code,
        CancellationToken cancellationToken)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return _db.Units.SingleOrDefaultAsync(x => x.Code == normalized, cancellationToken);
    }

    public async Task<IReadOnlyList<OrganizationUnit>> GetDescendantsAsync(
        string pathPrefix,
        CancellationToken cancellationToken)
        => await _db.Units
            .Where(x => x.Path.StartsWith(pathPrefix))
            .ToListAsync(cancellationToken);

    public async Task AddMembershipAsync(
        UnitMembership membership,
        CancellationToken cancellationToken)
        => await _db.Memberships.AddAsync(membership, cancellationToken);

    public async Task<IReadOnlyList<UnitMembership>> GetMembershipsAsync(
        string subjectId,
        CancellationToken cancellationToken)
        => await _db.Memberships
            .Where(x => x.SubjectId == subjectId)
            .ToListAsync(cancellationToken);

    public void RemoveMembership(UnitMembership membership)
        => _db.Memberships.Remove(membership);

    public async Task<IReadOnlyList<OrganizationUnitSummary>> GetTreeAsync(
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _db.Units.AsNoTracking().Where(x => !x.IsRemoved);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Path)
            .Select(x => new OrganizationUnitSummary(
                x.Id.Value,
                x.Code,
                x.Name,
                x.ShortName,
                x.ParentId == null ? null : x.ParentId.Value.Value,
                x.Path,
                x.Depth,
                x.IsActive,
                x.ExternalReference,
                _db.Memberships.Count(m => m.UnitId == x.Id),
                x.TypeCode,
                // Seviye adı katalogdan okunur: seviye yeniden adlandırıldığında
                // birim kayıtlarına dokunmadan her yerde güncel görünsün.
                _db.UnitTypes.Where(t => t.Code == x.TypeCode).Select(t => t.Name).FirstOrDefault()))
            .ToListAsync(cancellationToken);
    }

    public Task<OrganizationUnitSummary?> GetUnitAsync(Guid id, CancellationToken cancellationToken)
        => _db.Units
            .AsNoTracking()
            .Where(x => x.Id == new OrganizationUnitId(id) && !x.IsRemoved)
            .Select(x => new OrganizationUnitSummary(
                x.Id.Value,
                x.Code,
                x.Name,
                x.ShortName,
                x.ParentId == null ? null : x.ParentId.Value.Value,
                x.Path,
                x.Depth,
                x.IsActive,
                x.ExternalReference,
                _db.Memberships.Count(m => m.UnitId == x.Id),
                x.TypeCode,
                // Seviye adı katalogdan okunur: seviye yeniden adlandırıldığında
                // birim kayıtlarına dokunmadan her yerde güncel görünsün.
                _db.UnitTypes.Where(t => t.Code == x.TypeCode).Select(t => t.Name).FirstOrDefault()))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<UnitMembershipSummary>> GetUnitMembersAsync(
        Guid unitId,
        CancellationToken cancellationToken)
    {
        var id = new OrganizationUnitId(unitId);

        return await Project(
                _db.Memberships.AsNoTracking().Where(x => x.UnitId == id),
                orderBySubject: true)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UnitMembershipSummary>> GetSubjectMembershipsAsync(
        string subjectId,
        CancellationToken cancellationToken)
        => await Project(
                _db.Memberships.AsNoTracking().Where(x => x.SubjectId == subjectId),
                orderBySubject: false)
            .ToListAsync(cancellationToken);

    /// <summary>
    /// Birim adı bağıntılı alt sorgu ile okunur. Dönüştürülmüş anahtar tipleri
    /// (<see cref="OrganizationUnitId"/>) üzerinden kurulan JOIN'i EF
    /// çeviremiyor; alt sorgu aynı tip karşılaştırmasını kullandığı için
    /// sorunsuz çevriliyor.
    /// </summary>
    private IQueryable<UnitMembershipSummary> Project(
        IQueryable<UnitMembership> memberships,
        bool orderBySubject)
    {
        var ordered = orderBySubject
            ? memberships.OrderBy(x => x.SubjectId).ThenBy(x => x.Id)
            : memberships.OrderByDescending(x => x.IsPrimary).ThenBy(x => x.Id);

        return ordered.Select(membership => new UnitMembershipSummary(
            membership.Id,
            membership.SubjectId,
            membership.UnitId.Value,
            _db.Units.Where(u => u.Id == membership.UnitId).Select(u => u.Code).FirstOrDefault() ?? string.Empty,
            _db.Units.Where(u => u.Id == membership.UnitId).Select(u => u.Name).FirstOrDefault() ?? string.Empty,
            membership.IsPrimary,
            membership.Source.ToString(),
            membership.CreatedAt));
    }
}
