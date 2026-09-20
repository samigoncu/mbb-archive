namespace Mbb.Archive.BuildingBlocks.Application.Security;

/// <summary>Modules report references without exposing their private tables or document contents.</summary>
public interface IOrganizationUnitUsage
{
    Task<bool> HasReferencesAsync(Guid unitId, CancellationToken ct);
}
