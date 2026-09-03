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
