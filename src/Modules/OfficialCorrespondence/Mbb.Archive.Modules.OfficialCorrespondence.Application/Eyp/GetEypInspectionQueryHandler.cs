using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;

public sealed class GetEypInspectionQueryHandler :
    IQueryHandler<GetEypInspectionQuery, EypInspectionResponse>
{
    private readonly IEypInspectionRepository _repository;

    public GetEypInspectionQueryHandler(
        IEypInspectionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<EypInspectionResponse>> Handle(
        GetEypInspectionQuery query,
        CancellationToken ct)
    {
        var inspection = await _repository.GetAsync(query.Id, ct);

        return inspection is null
            ? Result<EypInspectionResponse>.Failure(
                Error.NotFound(
                    "official_correspondence.eyp_inspection_not_found",
                    "EYP inspection was not found."))
            : Result<EypInspectionResponse>.Success(
                InspectEypPackageCommandHandler.ToResponse(inspection));
    }
}
