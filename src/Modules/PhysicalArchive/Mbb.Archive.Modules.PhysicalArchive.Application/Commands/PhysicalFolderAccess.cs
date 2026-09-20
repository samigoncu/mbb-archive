using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

public sealed class PhysicalFolderAccess(IArchiveUnitDirectory units, IArchiveFilingCatalog filing,
    IFilePlanCatalog plans, ICurrentUserPermissions permissions, TimeProvider time, IUnitFilePlanPolicy unitPlans)
{
    public Task<ArchiveUnit?> OwnerAsync(Guid? id, CancellationToken ct)
        => units.ResolveWritableAsync(id, "physical-archive.manage.all", ct);
    public async Task<bool> CanModifyAsync(PhysicalFolder folder, CancellationToken ct)
        => folder.OwnerUnitId is { } id && await OwnerAsync(id, ct) is not null;
    public async Task<bool> IsPlanValidAsync(Guid unitId, string code, CancellationToken ct)
        => await unitPlans.IsCodeAssignedAsync(unitId, code, ct)
            && await plans.IsSelectableAsync(code, DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime), ct);
    public async Task<bool> MatchesDossierAsync(Guid? id, Guid owner, string code, CancellationToken ct)
    {
        if (id is null) return true;
        var dossier = await filing.GetDossierAsync(id.Value, ct);
        return dossier is not null && dossier.OwnerUnitId == owner && dossier.FilePlanCode == code;
    }
    public async Task<bool> CanLinkAsync(PhysicalFolder folder, Guid id, CancellationToken ct)
    {
        if (folder.OwnerUnitId is not { } owner || !await unitPlans.IsCodeAssignedAsync(owner, folder.FilePlanCode, ct)) return false;
        var document = await filing.GetDocumentAsync(id, ct);
        return document is not null && document.OwnerUnitId == folder.OwnerUnitId
            && (document.FilePlanCode is null || document.FilePlanCode == folder.FilePlanCode)
            && (folder.DigitalDossierId is null || document.DossierId == folder.DigitalDossierId);
    }
    public async Task<bool> DocumentsMatchOwnerAsync(PhysicalFolder folder, Guid owner, CancellationToken ct)
    {
        foreach (var link in folder.Documents)
        {
            var document = await filing.GetDocumentAsync(link.DocumentId, ct);
            if (document is null || document.OwnerUnitId != owner
                || (document.FilePlanCode is not null && document.FilePlanCode != folder.FilePlanCode)) return false;
        }
        return true;
    }
    public async Task<bool> CanAssignLegacyAsync(CancellationToken ct)
        => await permissions.HasAllPermissionsAsync(ct)
            || (await permissions.GetAsync(ct)).Contains("physical-archive.manage.all", StringComparer.OrdinalIgnoreCase);
}
