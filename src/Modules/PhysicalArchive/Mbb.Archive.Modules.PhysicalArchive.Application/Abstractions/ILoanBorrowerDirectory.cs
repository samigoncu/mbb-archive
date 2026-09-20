using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

public interface ILoanBorrowerDirectory
{
    Task<bool> IsActiveAsync(string subjectId, CancellationToken cancellationToken);
    Task<PagedResult<LoanBorrower>> SearchAsync(string query, PageRequest page, CancellationToken cancellationToken);
}

public sealed record LoanBorrower(string SubjectId, string UnitName);
