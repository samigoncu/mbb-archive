using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

public sealed class GetEvidenceValidationQueryHandler :
    IQueryHandler<GetEvidenceValidationQuery, EvidenceValidationResponse>
{
    private readonly IEvidenceRepository _repository;

    public GetEvidenceValidationQueryHandler(IEvidenceRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<EvidenceValidationResponse>> Handle(
        GetEvidenceValidationQuery query,
        CancellationToken ct)
    {
        var validation = await _repository.GetAsync(query.Id, ct);

        return validation is null
            ? Result<EvidenceValidationResponse>.Failure(
                Error.NotFound(
                    "evidence.validation_not_found",
                    "Evidence validation was not found."))
            : Result<EvidenceValidationResponse>.Success(
                new EvidenceValidationResponse(
                    validation.Id,
                    validation.Kind.ToString(),
                    validation.Status.ToString(),
                    validation.Provider,
                    validation.ContentSha256,
                    validation.ReportJson));
    }
}
