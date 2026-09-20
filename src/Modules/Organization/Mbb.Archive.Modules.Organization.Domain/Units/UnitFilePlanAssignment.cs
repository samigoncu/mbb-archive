namespace Mbb.Archive.Modules.Organization.Domain.Units;

public sealed class UnitFilePlanAssignment
{
    private UnitFilePlanAssignment() { }
    public UnitFilePlanAssignment(OrganizationUnitId unitId, Guid planId, Guid itemId, string code, string title, string version)
    { UnitId = unitId; PlanId = planId; ItemId = itemId; Code = code; Title = title; Version = version; }
    public OrganizationUnitId UnitId { get; private set; }
    public Guid PlanId { get; private set; }
    public Guid ItemId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
}
