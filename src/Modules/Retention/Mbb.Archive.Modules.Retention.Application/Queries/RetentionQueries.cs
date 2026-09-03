using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Application.Abstractions;

namespace Mbb.Archive.Modules.Retention.Application.Queries;

public sealed record GetRetentionCasesQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    RetentionCaseFilter? Filter = null)
    : IQuery<PagedResult<RetentionCaseListItem>>;

public sealed record GetRetentionRulesQuery : IQuery<IReadOnlyList<RetentionRuleListItem>>;

public sealed record GetLegalHoldsQuery(Guid RetentionCaseId)
    : IQuery<IReadOnlyList<LegalHoldListItem>>;

public sealed class RetentionQueryHandlers :
    IQueryHandler<GetRetentionCasesQuery, PagedResult<RetentionCaseListItem>>,
    IQueryHandler<GetRetentionRulesQuery, IReadOnlyList<RetentionRuleListItem>>,
    IQueryHandler<GetLegalHoldsQuery, IReadOnlyList<LegalHoldListItem>>
{
    private readonly IRetentionQueries _queries;

    public RetentionQueryHandlers(IRetentionQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<PagedResult<RetentionCaseListItem>>> Handle(
        GetRetentionCasesQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<RetentionCaseListItem>>.Failure(pageResult.Error);

        return Result<PagedResult<RetentionCaseListItem>>.Success(
            await _queries.GetCasesPageAsync(
                pageResult.Value,
                query.Filter ?? new RetentionCaseFilter(),
                cancellationToken));
    }

    public async Task<Result<IReadOnlyList<RetentionRuleListItem>>> Handle(
        GetRetentionRulesQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<RetentionRuleListItem>>.Success(
            await _queries.GetRulesAsync(cancellationToken));

    public async Task<Result<IReadOnlyList<LegalHoldListItem>>> Handle(
        GetLegalHoldsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<LegalHoldListItem>>.Success(
            await _queries.GetHoldsAsync(query.RetentionCaseId, cancellationToken));
}
