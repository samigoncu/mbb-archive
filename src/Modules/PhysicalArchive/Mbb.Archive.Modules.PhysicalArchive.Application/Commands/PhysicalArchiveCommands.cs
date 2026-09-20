using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

public sealed record CreateRootLocationCommand(
    string Code,
    string Name,
    string Barcode,
    /// <summary>Boş bırakılırsa katalogdaki en üst seviye kullanılır.</summary>
    string? TypeCode = null) : ICommand<Guid>;

public sealed record CreateChildLocationCommand(
    Guid ParentId,
    string TypeCode,
    string Code,
    string Name,
    string Barcode,
    int? Capacity) : ICommand<Guid>;

/// <summary>Yerleşim seviyesi tanımlar (bina, oda, raf, kuruma özel bir seviye…).</summary>
public sealed record CreateLocationTypeCommand(
    string Code, string Name, int Level, bool CanStoreFolder, bool AllowsCapacity) : ICommand<Guid>;

public sealed record UpdateLocationTypeCommand(
    string Code, string Name, int Level, bool CanStoreFolder, bool AllowsCapacity) : ICommand;

public sealed record SetLocationTypeActiveCommand(string Code, bool IsActive) : ICommand;

/// <summary>Yalnız kullanılmayan ve kurulumla gelmeyen seviye silinebilir.</summary>
public sealed record DeleteLocationTypeCommand(string Code) : ICommand;

/// <summary>Konum tanımını düzeltir. Tür ve üst düğüm değişmez.</summary>
public sealed record UpdateLocationCommand(
    Guid Id,
    string Code,
    string Name,
    string Barcode,
    int? Capacity) : ICommand;

/// <summary>Pasif konuma yeni klasör yerleştirilemez; kayıt ve geçmiş korunur.</summary>
public sealed record SetLocationActiveCommand(Guid Id, bool IsActive) : ICommand;

/// <summary>Yalnız altında düğüm ve içinde klasör bulunmayan konum silinebilir.</summary>
public sealed record DeleteLocationCommand(Guid Id) : ICommand;

public sealed record RegisterPhysicalFolderCommand(
    string Barcode,
    string Title,
    string FilePlanCode,
    Guid LocationId, Guid? OwnerUnitId = null, Guid? DigitalDossierId = null) : ICommand<Guid>;

public sealed record LinkDocumentToFolderCommand(
    Guid FolderId,
    Guid DocumentId) : ICommand;

public sealed record MovePhysicalFolderCommand(
    Guid FolderId,
    Guid DestinationLocationId) : ICommand;

public sealed record CheckoutPhysicalFolderCommand(
    Guid FolderId,
    string BorrowerSubjectId,
    string Purpose,
    DateTimeOffset DueAt,
    string? CheckedOutBy = null) : ICommand<Guid>;

public sealed record ReturnPhysicalFolderCommand(Guid LoanId, string? ReturnNote = null) : ICommand;
