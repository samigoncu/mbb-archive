using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
public sealed class GetFilePlanTreeQueryHandler : IQueryHandler<GetFilePlanTreeQuery,FilePlanTree>
{
    private readonly IClassificationQueries _queries; public GetFilePlanTreeQueryHandler(IClassificationQueries queries){_queries=queries;}
    public async Task<Result<FilePlanTree>> Handle(GetFilePlanTreeQuery query,CancellationToken ct)
    {
        var plan=await _queries.GetFilePlanTreeAsync(query.Id,ct);
        return plan is null?Result<FilePlanTree>.Failure(Error.NotFound("classification.file_plan_not_found","File plan was not found.")):Result<FilePlanTree>.Success(plan);
    }
}
