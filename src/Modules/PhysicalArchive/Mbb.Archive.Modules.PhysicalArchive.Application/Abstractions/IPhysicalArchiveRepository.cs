using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

public interface IPhysicalArchiveRepository
{
    Task AddLocationAsync(ArchiveLocation location, CancellationToken cancellationToken);
    Task<ArchiveLocation?> GetLocationAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> IdentityExistsAsync(string code, string barcode, CancellationToken cancellationToken);

    Task AddFolderAsync(PhysicalFolder folder, CancellationToken cancellationToken);
    Task<PhysicalFolder?> GetFolderAsync(Guid id, CancellationToken cancellationToken);
    Task<PhysicalFolder?> GetFolderByBarcodeAsync(string barcode, CancellationToken cancellationToken);
    Task<bool> FolderBarcodeExistsAsync(string barcode, CancellationToken cancellationToken);

    Task AddLoanAsync(PhysicalLoan loan, CancellationToken cancellationToken);
    Task<PhysicalLoan?> GetLoanAsync(Guid id, CancellationToken cancellationToken);
    Task<PhysicalLoan?> GetActiveLoanAsync(Guid folderId, CancellationToken cancellationToken);
}
