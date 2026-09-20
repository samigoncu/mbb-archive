using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Application.Abstractions;

public interface IOrganizationRepository
{
    Task AddUnitAsync(OrganizationUnit unit, CancellationToken cancellationToken);

    Task<OrganizationUnit?> GetUnitAsync(
        OrganizationUnitId id,
        CancellationToken cancellationToken);

    Task<OrganizationUnit?> FindUnitByCodeAsync(
        string code,
        CancellationToken cancellationToken);

    /// <summary>Alt ağaç taşındığında yolları tazelemek için.</summary>
    Task<IReadOnlyList<OrganizationUnit>> GetDescendantsAsync(
        string pathPrefix,
        CancellationToken cancellationToken);

    Task AddMembershipAsync(UnitMembership membership, CancellationToken cancellationToken);

    Task<IReadOnlyList<UnitMembership>> GetMembershipsAsync(
        string subjectId,
        CancellationToken cancellationToken);

    void RemoveMembership(UnitMembership membership);
}

public interface IOrganizationQueries
{
    Task<IReadOnlyList<OrganizationUnitSummary>> GetTreeAsync(
        bool includeInactive,
        CancellationToken cancellationToken);

    Task<OrganizationUnitSummary?> GetUnitAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<UnitMembershipSummary>> GetUnitMembersAsync(
        Guid unitId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<UnitMembershipSummary>> GetSubjectMembershipsAsync(
        string subjectId,
        CancellationToken cancellationToken);
}
