using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Organization.Application.Units;
using Mbb.Archive.Modules.Workflow.Application;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class WorkflowAssignmentDirectory(IArchiveFilingCatalog filing, IDocumentVisibility visibility,
    ICurrentUserScope scopeProvider, ICurrentUserPermissions current, OrganizationQueryHandlers organization,
    IAccessRepository access) : IWorkflowAssignmentDirectory
{
    public async Task<IReadOnlyList<WorkflowAssignee>> GetCandidatesAsync(Guid documentId, CancellationToken ct, string? permission = null)
    {
        if (!(await visibility.FilterAsync([documentId], ct)).Contains(documentId)) return [];
        var document = await filing.GetDocumentAsync(documentId, ct);
        if (document?.OwnerUnitId is not { } unitId) return [];
        var scope = await scopeProvider.GetAsync(ct);
        var isSuperAdmin = await current.HasAllPermissionsAsync(ct);
        if (!scope.UnitIds.Contains(unitId) && !isSuperAdmin) return [];
        var tree = await organization.Handle(new GetUnitTreeQuery(), ct);
        if (tree.IsFailure || !tree.Value.Any(unit => unit.Id == unitId && unit.IsActive)) return [];
        var docUnit = tree.Value.FirstOrDefault(unit => unit.Id == unitId);
        var docUnitName = docUnit?.Name ?? "Birim";

        var candidates = new List<WorkflowAssignee>();
        var members = await organization.Handle(new GetUnitMembersQuery(unitId), ct);
        if (!members.IsFailure && members.Value is not null)
        {
            foreach (var member in members.Value.DistinctBy(member => member.SubjectId))
            {
                var permissions = await access.GetPermissionsAsync(member.SubjectId, [], ct);
                var bootstrapSelf = member.SubjectId == current.Subject && isSuperAdmin;
                if (bootstrapSelf || (permissions.Contains("workflow.read") && permissions.Contains("workflow.task.complete")
                    && (permission is null || permissions.Contains(permission))))
                {
                    candidates.Add(new(member.SubjectId, member.UnitName));
                }
            }
        }

        if (isSuperAdmin && !candidates.Any(c => c.SubjectId == current.Subject))
        {
            candidates.Add(new(current.Subject, $"{docUnitName} (Sistem Yöneticisi)"));
        }

        if (candidates.Count <= 1 || isSuperAdmin)
        {
            foreach (var unit in tree.Value.Where(u => u.IsActive && u.Id != unitId))
            {
                var unitMembers = await organization.Handle(new GetUnitMembersQuery(unit.Id), ct);
                if (unitMembers.IsFailure || unitMembers.Value is null) continue;
                foreach (var member in unitMembers.Value.DistinctBy(m => m.SubjectId))
                {
                    if (candidates.Any(c => c.SubjectId == member.SubjectId)) continue;
                    var permissions = await access.GetPermissionsAsync(member.SubjectId, [], ct);
                    if (permissions.Contains("workflow.read") && permissions.Contains("workflow.task.complete")
                        && (permission is null || permissions.Contains(permission)))
                    {
                        candidates.Add(new(member.SubjectId, member.UnitName));
                    }
                }
            }
        }

        return candidates.OrderBy(candidate => candidate.SubjectId).ToArray();
    }
}
