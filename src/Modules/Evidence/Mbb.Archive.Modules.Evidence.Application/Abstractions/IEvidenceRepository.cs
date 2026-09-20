using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Evidence.Application.Validations;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Application.Abstractions;

public interface IEvidenceRepository
{
    Task AddAsync(
        EvidenceValidation validation,
        CancellationToken cancellationToken);

    Task<EvidenceValidation?> GetAsync(
        Guid id,
        CancellationToken cancellationToken);
}

/// <summary>Okuma modeli; yazma deposundan ayrı tutulur.</summary>
public interface IEvidenceQueries
{
    Task<PagedResult<EvidenceValidationListItem>> GetPageAsync(
        PageRequest page,
        string? kind,
        string? status,
        Guid? documentId,
        CancellationToken cancellationToken);
}
