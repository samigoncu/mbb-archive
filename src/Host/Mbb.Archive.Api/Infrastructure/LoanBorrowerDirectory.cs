using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class LoanBorrowerDirectory(IOrganizationQueries organization, ICurrentUserScope scope) : ILoanBorrowerDirectory
{
    private async Task<IReadOnlyList<OrganizationUnitSummary>> VisibleUnitsAsync(CancellationToken ct)
    {
        var current = await scope.GetAsync(ct);
        return (await organization.GetTreeAsync(false, ct)).Where(x => x.IsActive
            && (current.Unrestricted || current.UnitPaths.Any(path => x.Path.StartsWith(path, StringComparison.Ordinal)))).ToArray();
    }

    public async Task<bool> IsActiveAsync(string subjectId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(subjectId) || subjectId.Length > 300) return false;
        var active = (await VisibleUnitsAsync(cancellationToken)).Select(x => x.Id).ToHashSet();
        return (await organization.GetSubjectMembershipsAsync(subjectId, cancellationToken)).Any(x => active.Contains(x.UnitId));
    }

    public async Task<PagedResult<LoanBorrower>> SearchAsync(string query, PageRequest page, CancellationToken cancellationToken)
    {
        var people = new Dictionary<string, LoanBorrower>(StringComparer.Ordinal);
        foreach (var unit in await VisibleUnitsAsync(cancellationToken))
            foreach (var member in await organization.GetUnitMembersAsync(unit.Id, cancellationToken))
                if (string.IsNullOrEmpty(query) || member.SubjectId.Contains(query, StringComparison.OrdinalIgnoreCase)
                    || member.UnitName.Contains(query, StringComparison.OrdinalIgnoreCase))
                    people.TryAdd(member.SubjectId, new(member.SubjectId, member.UnitName));
        return new(people.Values.OrderBy(x => x.SubjectId).Skip((page.Page - 1) * page.PageSize).Take(page.PageSize).ToArray(),
            page.Page, page.PageSize, people.Count);
    }
}
