namespace Mbb.Archive.Modules.Classification.Contracts;

public interface IUnitFilePlanPolicy
{
    Task<IReadOnlyList<UnitFilePlanEntry>> GetAssignedAsync(Guid unitId, CancellationToken ct);
    Task<bool> IsAssignedAsync(Guid unitId, Guid planId, Guid itemId, CancellationToken ct);
    Task<bool> IsCodeAssignedAsync(Guid unitId, string code, CancellationToken ct);
}
public sealed record UnitFilePlanEntry(Guid UnitId, Guid PlanId, Guid ItemId, string Code, string Title, string Version);
