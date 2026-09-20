using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
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
    private readonly IDocumentVisibility _visibility;

    public async Task<Result<RetentionCaseListItem>> GetCase(Guid id, CancellationToken ct)
    {
        var item = await _queries.GetCaseAsync(id, ct);
        return item is null || !(await _visibility.FilterAsync([item.DocumentId], ct)).Contains(item.DocumentId) ? Result<RetentionCaseListItem>.Failure(Error.NotFound("retention.case_not_found", "Saklama dosyası bulunamadı."))
            : Result<RetentionCaseListItem>.Success(item);
    }

    public RetentionQueryHandlers(IRetentionQueries queries, IDocumentVisibility visibility)
    {
        _queries = queries; _visibility = visibility;
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
    {
        var item = await GetCase(query.RetentionCaseId, cancellationToken);
        if (item.IsFailure) return Result<IReadOnlyList<LegalHoldListItem>>.Failure(item.Error);
        return Result<IReadOnlyList<LegalHoldListItem>>.Success(await _queries.GetHoldsAsync(query.RetentionCaseId, cancellationToken));
    }
}
