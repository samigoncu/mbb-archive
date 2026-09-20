using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

public interface IPhysicalArchiveRepository
{
    Task AddLocationAsync(ArchiveLocation location, CancellationToken cancellationToken);
    Task<ArchiveLocation?> GetLocationAsync(Guid id, CancellationToken cancellationToken);
    /// <param name="excludeId">Güncellemede kaydın kendi kodu çakışma sayılmasın diye dışarıda bırakılır.</param>
    Task<bool> IdentityExistsAsync(string code, string barcode, CancellationToken cancellationToken, Guid? excludeId = null);
    Task<bool> LocationHasChildrenAsync(Guid id, CancellationToken cancellationToken);
    Task<int> FolderCountAtLocationAsync(Guid id, CancellationToken cancellationToken);
    void RemoveLocation(ArchiveLocation location);

    Task<IReadOnlyList<ArchiveLocationTypeDefinition>> GetLocationTypesAsync(CancellationToken cancellationToken);
    Task<ArchiveLocationTypeDefinition?> GetLocationTypeAsync(string code, CancellationToken cancellationToken);
    Task<int> LocationCountByTypeAsync(string code, CancellationToken cancellationToken);
    Task AddLocationTypeAsync(ArchiveLocationTypeDefinition definition, CancellationToken cancellationToken);
    void RemoveLocationType(ArchiveLocationTypeDefinition definition);

    Task AddFolderAsync(PhysicalFolder folder, CancellationToken cancellationToken);
    Task<PhysicalFolder?> GetFolderAsync(Guid id, CancellationToken cancellationToken);
    Task<PhysicalFolder?> GetFolderByBarcodeAsync(string barcode, CancellationToken cancellationToken);
    Task<bool> FolderBarcodeExistsAsync(string barcode, CancellationToken cancellationToken);

    Task AddLoanAsync(PhysicalLoan loan, CancellationToken cancellationToken);
    Task<PhysicalLoan?> GetLoanAsync(Guid id, CancellationToken cancellationToken);
    Task<PhysicalLoan?> GetActiveLoanAsync(Guid folderId, CancellationToken cancellationToken);
}
