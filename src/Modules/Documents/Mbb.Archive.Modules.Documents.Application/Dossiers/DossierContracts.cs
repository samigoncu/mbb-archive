using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
namespace Mbb.Archive.Modules.Documents.Application.Dossiers;

public sealed record DossierFilter(Guid? OwnerUnitId = null, string? FilePlanCode = null, int? Year = null, string? Search = null, string? Sort = null);
public sealed record DossierItem(Guid Id, Guid OwnerUnitId, string OwnerUnitName, Guid FilePlanId,
    Guid FilePlanItemId, string FilePlanVersion, string FilePlanCode, string FilePlanTitle,
    string Title, int Year, int DocumentCount);
public sealed record RenameDossierRequest(string Title, string ExpectedTitle);
public sealed record CreateDossierRequest(Guid? OwnerUnitId, Guid FilePlanId, Guid FilePlanItemId, string Title, int Year);
public interface IDossierRepository
{
    Task AddAsync(DigitalDossier dossier, CancellationToken ct);
    Task<bool> RenameAsync(Guid id, string expectedTitle, string title, CancellationToken ct);
    Task<DigitalDossier?> GetAsync(Guid id, CancellationToken ct);
}
public interface IDossierQueries
{
    Task<PagedResult<DossierItem>> ListAsync(PageRequest page, DossierFilter filter, CancellationToken ct);
    Task<DossierItem?> GetAsync(Guid id, CancellationToken ct);
}
