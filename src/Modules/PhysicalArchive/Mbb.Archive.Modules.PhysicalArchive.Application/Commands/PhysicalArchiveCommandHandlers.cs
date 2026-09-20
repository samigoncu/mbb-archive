using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Commands;

public sealed partial class PhysicalArchiveCommandHandlers :
    ICommandHandler<CreateRootLocationCommand, Guid>,
    ICommandHandler<CreateChildLocationCommand, Guid>,
    ICommandHandler<CreateLocationTypeCommand, Guid>,
    ICommandHandler<UpdateLocationTypeCommand>,
    ICommandHandler<SetLocationTypeActiveCommand>,
    ICommandHandler<DeleteLocationTypeCommand>,
    ICommandHandler<UpdateLocationCommand>,
    ICommandHandler<SetLocationActiveCommand>,
    ICommandHandler<DeleteLocationCommand>,
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
    private readonly PhysicalFolderAccess _access;
    private readonly ILoanBorrowerDirectory? _borrowers;
    private readonly ICurrentUserPermissions? _permissions;

    public PhysicalArchiveCommandHandlers(
        IPhysicalArchiveRepository repository,
        IUnitOfWork<PhysicalArchiveBoundary> unitOfWork,
        IOutbox<PhysicalArchiveBoundary> outbox,
        TimeProvider time,
        PhysicalFolderAccess access,
        ILoanBorrowerDirectory? borrowers = null,
        ICurrentUserPermissions? permissions = null)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _outbox = outbox;
        _time = time;
        _access = access;
        _borrowers = borrowers;
        _permissions = permissions;
    }

    public async Task<Result<Guid>> Handle(
        CreateRootLocationCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Code) || string.IsNullOrWhiteSpace(command.Name) || string.IsNullOrWhiteSpace(command.Barcode))
            return Invalid<Guid>("Konum kodu, adı ve barkodu zorunludur.");
        if (await _repository.IdentityExistsAsync(command.Code, command.Barcode, cancellationToken))
            return Result<Guid>.Failure(DuplicateIdentity());

        try
        {
            var types = await _repository.GetLocationTypesAsync(cancellationToken);
            var rootType = command.TypeCode is { Length: > 0 } code
                ? types.FirstOrDefault(x => x.Code == code)
                : types.Where(x => x.IsActive).OrderBy(x => x.Level).FirstOrDefault();

            if (rootType is null) return Invalid<Guid>("Yerleşim seviyesi bulunamadı. Önce seviye tanımlayın.");

            var location = ArchiveLocation.CreateRoot(
                rootType,
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
        if (string.IsNullOrWhiteSpace(command.Code) || string.IsNullOrWhiteSpace(command.Name) || string.IsNullOrWhiteSpace(command.Barcode))
            return Invalid<Guid>("Konum kodu, adı ve barkodu zorunludur.");
        var parent = await _repository.GetLocationAsync(command.ParentId, cancellationToken);

        if (parent is null)
            return Result<Guid>.Failure(LocationNotFound());

        if (await _repository.IdentityExistsAsync(command.Code, command.Barcode, cancellationToken))
            return Result<Guid>.Failure(DuplicateIdentity());

        try
        {
            var parentType = await _repository.GetLocationTypeAsync(parent.TypeCode, cancellationToken);
            var childType = await _repository.GetLocationTypeAsync(command.TypeCode, cancellationToken);

            if (parentType is null || childType is null)
                return Invalid<Guid>("Yerleşim seviyesi bulunamadı.");

            var location = ArchiveLocation.CreateChild(
                parent,
                parentType,
                childType,
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
        var owner = await _access.OwnerAsync(command.OwnerUnitId, cancellationToken);
        if (owner is null)
            return Invalid<Guid>("Yetkili olduğunuz aktif birim seçilmelidir.");
        if (!await _access.IsPlanValidAsync(owner.Id, command.FilePlanCode, cancellationToken)
            || !await _access.MatchesDossierAsync(command.DigitalDossierId, owner.Id, command.FilePlanCode, cancellationToken))
            return Invalid<Guid>("Dosya planı veya dijital dosyanın birim ve konu eşleşmesi geçersiz.");
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

            var locationType = await _repository.GetLocationTypeAsync(location.TypeCode, cancellationToken);
            if (locationType is null) return Invalid<Guid>("Konumun yerleşim seviyesi tanımlı değil.");

            var folder = PhysicalFolder.Register(
                command.Barcode,
                command.Title,
                command.FilePlanCode,
                location,
                locationType,
                now);

            folder.AssignOwnership(owner.Id, command.DigitalDossierId);
            await _repository.AddFolderAsync(folder, cancellationToken);
            _outbox.Enqueue(new PhysicalFolderOwnerAssignedIntegrationEvent(Guid.CreateVersion7(), folder.Id, owner.Id, now));

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

        if (folder is null || !await _access.CanModifyAsync(folder, cancellationToken))
            return Result.Failure(FolderNotFound());

        try
        {
            if (!await _access.CanLinkAsync(folder, command.DocumentId, cancellationToken))
                return Result.Failure(Error.Validation("physical_archive.invalid_link", "Belge, dosyayla aynı birime ve uygun dosya planına ait olmalıdır."));
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

        if (folder is null || !await _access.CanModifyAsync(folder, cancellationToken))
            return Result.Failure(FolderNotFound());

        var destination = await _repository.GetLocationAsync(
            command.DestinationLocationId,
            cancellationToken);

        if (destination is null)
            return Result.Failure(LocationNotFound());

        try
        {
            var destinationType = await _repository.GetLocationTypeAsync(destination.TypeCode, cancellationToken);
            if (destinationType is null)
                return Result.Failure(Error.Validation("physical_archive.invalid", "Hedefin yerleşim seviyesi tanımlı değil."));

            folder.MoveTo(destination, destinationType, _time.GetUtcNow());
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

        if (folder is null || !await _access.CanModifyAsync(folder, cancellationToken))
            return Result<Guid>.Failure(FolderNotFound());

        if (_borrowers is null || string.IsNullOrWhiteSpace(command.BorrowerSubjectId)
            || !await _borrowers.IsActiveAsync(command.BorrowerSubjectId.Trim(), cancellationToken))
            return Invalid<Guid>("Teslim alan kişi etkin kurum personeli olarak doğrulanamadı. Personel listesinden seçim yapın.");

        if (await _repository.GetActiveLoanAsync(folder.Id, cancellationToken) is not null)
        {
            return Result<Guid>.Failure(
                Error.Conflict(
                    "physical_archive.active_loan",
                    "Bu klasör şu anda zaten ödünç verilmiş durumda (etkin bir zimmet kaydı bulunuyor)."));
        }

        try
        {
            var now = _time.GetUtcNow();

            folder.CheckOut();

            var officer = !string.IsNullOrWhiteSpace(command.CheckedOutBy)
                ? command.CheckedOutBy.Trim()
                : (_permissions?.Subject is { Length: > 0 } s && s != "anonymous" ? s : "Arşiv Görevlisi");

            var loan = PhysicalLoan.Start(
                folder.Id,
                command.BorrowerSubjectId,
                command.Purpose,
                now,
                command.DueAt,
                officer);

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

        if (folder is null || !await _access.CanModifyAsync(folder, cancellationToken))
            return Result.Failure(FolderNotFound());

        if (loan.Status == PhysicalLoanStatus.Returned)
            return Result.Success();

        var now = _time.GetUtcNow();

        loan.Return(now, command.ReturnNote);
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

    public async Task<Result> AssignLegacyOwnerAsync(Guid folderId, Guid unitId, CancellationToken ct)
    {
        if (!await _access.CanAssignLegacyAsync(ct))
            return Result.Failure(new Error("physical_archive.owner_forbidden", "Kurum genelinde yönetim yetkisi gerekir.", ErrorType.Forbidden));
        var folder = await _repository.GetFolderAsync(folderId, ct);
        var owner = await _access.OwnerAsync(unitId, ct);
        if (folder is null || owner is null) return Result.Failure(FolderNotFound());
        if (folder.OwnerUnitId is not null || !await _access.DocumentsMatchOwnerAsync(folder, owner.Id, ct))
            return Result.Failure(Error.Conflict("physical_archive.owner_review", "Dosya birimsiz olmalı; bağlı belgelerin birimi ve dosya planı hedef birimle uyuşmalıdır."));
        folder.AssignOwnership(owner.Id);
        _outbox.Enqueue(new PhysicalFolderOwnerAssignedIntegrationEvent(Guid.CreateVersion7(), folder.Id, owner.Id, _time.GetUtcNow()));
        await _unitOfWork.SaveChangesAsync(ct);
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
