using Mbb.Archive.Modules.Organization.Domain.Units;
namespace Mbb.Archive.Modules.Organization.Application.Abstractions;

public interface IUnitPlanAssignments
{
    Task<IReadOnlyList<UnitFilePlanAssignment>> GetAsync(OrganizationUnitId unitId, CancellationToken ct);
    Task ReplaceAsync(OrganizationUnitId unitId, IReadOnlyList<UnitFilePlanAssignment> items, CancellationToken ct);
}
