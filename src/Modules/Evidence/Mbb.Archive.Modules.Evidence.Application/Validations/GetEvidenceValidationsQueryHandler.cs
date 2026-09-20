using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

public sealed class GetEvidenceValidationsQueryHandler :
    IQueryHandler<GetEvidenceValidationsQuery, PagedResult<EvidenceValidationListItem>>
{
    private readonly IEvidenceQueries _queries;

    public GetEvidenceValidationsQueryHandler(IEvidenceQueries queries)
        => _queries = queries;

    public async Task<Result<PagedResult<EvidenceValidationListItem>>> Handle(
        GetEvidenceValidationsQuery query,
        CancellationToken ct)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<EvidenceValidationListItem>>.Failure(pageResult.Error);

        var result = await _queries.GetPageAsync(
            pageResult.Value,
            query.Kind,
            query.Status,
            query.DocumentId,
            ct);

        return Result<PagedResult<EvidenceValidationListItem>>.Success(result);
    }
}
