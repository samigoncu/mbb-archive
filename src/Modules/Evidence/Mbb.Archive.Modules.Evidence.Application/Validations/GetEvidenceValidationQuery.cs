using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

public sealed record GetEvidenceValidationQuery(Guid Id)
    : IQuery<EvidenceValidationResponse>;
