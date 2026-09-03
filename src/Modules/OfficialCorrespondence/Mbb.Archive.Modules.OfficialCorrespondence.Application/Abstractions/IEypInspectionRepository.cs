using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;

public interface IEypInspectionRepository
{
    Task AddAsync(
        EypPackageInspection inspection,
        CancellationToken cancellationToken);

    Task<EypPackageInspection?> GetAsync(
        Guid id,
        CancellationToken cancellationToken);
}
