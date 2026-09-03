using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

public interface IPhysicalArchiveQueries
{
    Task<IReadOnlyList<LocationListItem>> GetLocationsAsync(
        string? type,
        CancellationToken cancellationToken);
    Task<PagedResult<FolderListItem>> GetFoldersPageAsync(
        PageRequest page,
        FolderFilter filter,
        CancellationToken cancellationToken);
    Task<FolderDetails?> GetFolderAsync(Guid id, CancellationToken cancellationToken);
    Task<FolderDetails?> GetFolderByBarcodeAsync(string barcode, CancellationToken cancellationToken);
    Task<IReadOnlyList<LocationOccupancyItem>> GetLocationOccupancyAsync(
        CancellationToken cancellationToken);
    Task<PagedResult<LoanDetailsItem>> GetLoansPageAsync(
        PageRequest page,
        LoanFilter filter,
        DateTimeOffset now,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<LoanListItem>> GetOverdueLoansAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken);
}

/// <summary>Kapasitesi tanımlı bir yerleşim biriminin doluluk özeti.</summary>
public sealed record LocationOccupancyItem(
    Guid Id,
    Guid? ParentId,
    string Type,
    string Code,
    string Name,
    string Barcode,
    int? Capacity,
    int FolderCount);

/// <summary>Ödünç listesi filtresi. `OverdueOnly` iade edilmemiş ve süresi geçmişleri seçer.</summary>
public sealed record LoanFilter(
    string? Status = null,
    Guid? FolderId = null,
    string? BorrowerSubjectId = null,
    bool OverdueOnly = false,
    int? DueInDays = null);

/// <summary>Zimmet ekranı için klasör bilgisiyle zenginleştirilmiş ödünç kaydı.</summary>
public sealed record LoanDetailsItem(
    Guid Id,
    Guid FolderId,
    string FolderBarcode,
    string FolderTitle,
    string FilePlanCode,
    string BorrowerSubjectId,
    string Purpose,
    string Status,
    DateTimeOffset CheckedOutAt,
    DateTimeOffset DueAt,
    DateTimeOffset? ReturnedAt,
    bool IsOverdue,
    int DaysOverdue);

public sealed record LocationListItem(
    Guid Id,
    Guid? ParentId,
    string Type,
    string Code,
    string Name,
    string Barcode,
    bool IsActive);

/// <summary>Klasör listesi filtresi. Tüm alanlar opsiyoneldir; boş filtre tüm klasörleri sayfalar.</summary>
public sealed record FolderFilter(
    string? Barcode = null,
    string? Title = null,
    string? FilePlanCode = null,
    Guid? LocationId = null,
    string? Status = null,
    int? Year = null,
    Guid? ContainsDocumentId = null);

public sealed record FolderListItem(
    Guid Id,
    string Barcode,
    string Title,
    string FilePlanCode,
    Guid LocationId,
    string LocationCode,
    string LocationName,
    string Status,
    int DocumentCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastMovedAt);

public sealed record FolderDetails(
    Guid Id,
    string Barcode,
    string Title,
    string FilePlanCode,
    Guid LocationId,
    string Status,
    IReadOnlyList<Guid> DocumentIds);

public sealed record LoanListItem(
    Guid Id,
    Guid FolderId,
    string BorrowerSubjectId,
    string Purpose,
    string Status,
    DateTimeOffset CheckedOutAt,
    DateTimeOffset DueAt);
