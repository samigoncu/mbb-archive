using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

public sealed record CreateRootLocationCommand(
    string Code,
    string Name,
    string Barcode) : ICommand<Guid>;

public sealed record CreateChildLocationCommand(
    Guid ParentId,
    ArchiveLocationType Type,
    string Code,
    string Name,
    string Barcode,
    int? Capacity) : ICommand<Guid>;

public sealed record RegisterPhysicalFolderCommand(
    string Barcode,
    string Title,
    string FilePlanCode,
    Guid LocationId) : ICommand<Guid>;

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
    DateTimeOffset DueAt) : ICommand<Guid>;

public sealed record ReturnPhysicalFolderCommand(Guid LoanId) : ICommand;
