using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

public sealed class PhysicalArchiveCommandHandlers :
    ICommandHandler<CreateRootLocationCommand, Guid>,
    ICommandHandler<CreateChildLocationCommand, Guid>,
    ICommandHandler<RegisterPhysicalFolderCommand, Guid>,
    ICommandHandler<LinkDocumentToFolderCommand>,
    ICommandHandler<MovePhysicalFolderCommand>,
    ICommandHandler<CheckoutPhysicalFolderCommand, Guid>,
    ICommandHandler<ReturnPhysicalFolderCommand>
{
    private readonly IPhysicalArchiveRepository _repository;
    private readonly IUnitOfWork<PhysicalArchiveBoundary> _unitOfWork;
    private readonly IOutbox<PhysicalArchiveBoundary> _outbox;
    private readonly TimeProvider _time;

    public PhysicalArchiveCommandHandlers(
        IPhysicalArchiveRepository repository,
        IUnitOfWork<PhysicalArchiveBoundary> unitOfWork,
        IOutbox<PhysicalArchiveBoundary> outbox,
        TimeProvider time)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _outbox = outbox;
        _time = time;
    }

    public async Task<Result<Guid>> Handle(
        CreateRootLocationCommand command,
        CancellationToken cancellationToken)
    {
        if (await _repository.IdentityExistsAsync(command.Code, command.Barcode, cancellationToken))
            return Result<Guid>.Failure(DuplicateIdentity());

        try
        {
            var location = ArchiveLocation.CreateRoot(
                command.Code,
                command.Name,
                command.Barcode,
                _time.GetUtcNow());

            await _repository.AddLocationAsync(location, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(location.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result<Guid>> Handle(
        CreateChildLocationCommand command,
        CancellationToken cancellationToken)
    {
        var parent = await _repository.GetLocationAsync(command.ParentId, cancellationToken);

        if (parent is null)
            return Result<Guid>.Failure(LocationNotFound());

        if (await _repository.IdentityExistsAsync(command.Code, command.Barcode, cancellationToken))
            return Result<Guid>.Failure(DuplicateIdentity());

        try
        {
            var location = ArchiveLocation.CreateChild(
                parent,
                command.Type,
                command.Code,
                command.Name,
                command.Barcode,
                command.Capacity,
                _time.GetUtcNow());

            await _repository.AddLocationAsync(location, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(location.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result<Guid>> Handle(
        RegisterPhysicalFolderCommand command,
        CancellationToken cancellationToken)
    {
        if (await _repository.FolderBarcodeExistsAsync(command.Barcode, cancellationToken))
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "physical_archive.folder_barcode_exists",
                    "Folder barcode is already in use."));
        }

        var location = await _repository.GetLocationAsync(command.LocationId, cancellationToken);

        if (location is null)
            return Result<Guid>.Failure(LocationNotFound());

        try
        {
            var now = _time.GetUtcNow();

            var folder = PhysicalFolder.Register(
                command.Barcode,
                command.Title,
                command.FilePlanCode,
                location,
                now);

            await _repository.AddFolderAsync(folder, cancellationToken);

            _outbox.Enqueue(
                new PhysicalFolderRegisteredIntegrationEvent(
                    Guid.CreateVersion7(),
                    folder.Id,
                    folder.Barcode,
                    folder.LocationId,
                    now));

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(folder.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result> Handle(
        LinkDocumentToFolderCommand command,
        CancellationToken cancellationToken)
    {
        var folder = await _repository.GetFolderAsync(command.FolderId, cancellationToken);

        if (folder is null)
            return Result.Failure(FolderNotFound());

        try
        {
            folder.LinkDocument(command.DocumentId, _time.GetUtcNow());
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("physical_archive.link_conflict", ex.Message));
        }
    }

    public async Task<Result> Handle(
        MovePhysicalFolderCommand command,
        CancellationToken cancellationToken)
    {
        var folder = await _repository.GetFolderAsync(command.FolderId, cancellationToken);

        if (folder is null)
            return Result.Failure(FolderNotFound());

        var destination = await _repository.GetLocationAsync(
            command.DestinationLocationId,
            cancellationToken);

        if (destination is null)
            return Result.Failure(LocationNotFound());

        try
        {
            folder.MoveTo(destination, _time.GetUtcNow());
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(Error.Conflict("physical_archive.move_conflict", ex.Message));
        }
    }

    public async Task<Result<Guid>> Handle(
        CheckoutPhysicalFolderCommand command,
        CancellationToken cancellationToken)
    {
        var folder = await _repository.GetFolderAsync(command.FolderId, cancellationToken);

        if (folder is null)
            return Result<Guid>.Failure(FolderNotFound());

        if (await _repository.GetActiveLoanAsync(folder.Id, cancellationToken) is not null)
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "physical_archive.active_loan",
                    "Folder already has an active loan."));
        }

        try
        {
            var now = _time.GetUtcNow();

            folder.CheckOut();

            var loan = PhysicalLoan.Start(
                folder.Id,
                command.BorrowerSubjectId,
                command.Purpose,
                now,
                command.DueAt);

            await _repository.AddLoanAsync(loan, cancellationToken);

            _outbox.Enqueue(
                new PhysicalLoanChangedIntegrationEvent(
                    Guid.CreateVersion7(),
                    loan.Id,
                    folder.Id,
                    loan.Status.ToString(),
                    loan.BorrowerSubjectId,
                    now));

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(loan.Id);
        }
        catch (DomainRuleViolationException ex)
        {
            return Invalid<Guid>(ex.Message);
        }
    }

    public async Task<Result> Handle(
        ReturnPhysicalFolderCommand command,
        CancellationToken cancellationToken)
    {
        var loan = await _repository.GetLoanAsync(command.LoanId, cancellationToken);

        if (loan is null)
            return Result.Failure(Error.NotFound("physical_archive.loan_not_found", "Loan was not found."));

        var folder = await _repository.GetFolderAsync(loan.FolderId, cancellationToken);

        if (folder is null)
            return Result.Failure(FolderNotFound());

        var now = _time.GetUtcNow();

        loan.Return(now);
        folder.CheckIn();

        _outbox.Enqueue(
            new PhysicalLoanChangedIntegrationEvent(
                Guid.CreateVersion7(),
                loan.Id,
                folder.Id,
                loan.Status.ToString(),
                loan.BorrowerSubjectId,
                now));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static Error DuplicateIdentity()
        => Error.Conflict(
            "physical_archive.location_identity_exists",
            "Location code or barcode is already in use.");

    private static Error LocationNotFound()
        => Error.NotFound(
            "physical_archive.location_not_found",
            "Archive location was not found.");

    private static Error FolderNotFound()
        => Error.NotFound(
            "physical_archive.folder_not_found",
            "Physical folder was not found.");

    private static Result<T> Invalid<T>(string message)
        => Result<T>.Failure(Error.Validation("physical_archive.invalid", message));
}
