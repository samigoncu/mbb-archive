using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Application.Documents.Create;

public sealed class CreateDocumentCommandHandler
    : ICommandHandler<CreateDocumentCommand, CreateDocumentResponse>
{
    private readonly IDocumentRepository _documents;
    private readonly IOutbox<DocumentsBoundary> _outbox;
    private readonly IUnitOfWork<DocumentsBoundary> _unitOfWork;
    private readonly IArchiveUnitDirectory _units;
    private readonly Mbb.Archive.Modules.Documents.Application.Dossiers.IDossierRepository _dossiers;
    private readonly TimeProvider _timeProvider;
    private readonly Mbb.Archive.Modules.Classification.Contracts.IUnitFilePlanPolicy _unitPlans;

    public CreateDocumentCommandHandler(
        IDocumentRepository documents,
        IOutbox<DocumentsBoundary> outbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork,
        IArchiveUnitDirectory units,
        Mbb.Archive.Modules.Documents.Application.Dossiers.IDossierRepository dossiers,
        TimeProvider timeProvider, Mbb.Archive.Modules.Classification.Contracts.IUnitFilePlanPolicy unitPlans)
    {
        _documents = documents;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _units = units;
        _dossiers = dossiers;
        _timeProvider = timeProvider;
        _unitPlans = unitPlans;
    }

    public async Task<Result<CreateDocumentResponse>> Handle(
        CreateDocumentCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Title))
            return Result<CreateDocumentResponse>.Failure(CreateDocumentErrors.TitleRequired);

        if (command.Title.Trim().Length > 300)
            return Result<CreateDocumentResponse>.Failure(CreateDocumentErrors.TitleTooLong);

        var now = _timeProvider.GetUtcNow();
        var document = Document.Create(command.Title, now);

        var dossier = command.DossierId is { } dossierId ? await _dossiers.GetAsync(dossierId, cancellationToken) : null;
        if (command.DossierId is not null && dossier is null)
            return Result<CreateDocumentResponse>.Failure(Error.NotFound("dossiers.not_found", "Dijital dosya bulunamadı."));
        if (dossier is not null && command.OwnerUnitId is { } requestedOwner && requestedOwner != dossier.OwnerUnitId)
            return Result<CreateDocumentResponse>.Failure(Error.Validation("documents.owner_mismatch", "Belge ve dijital dosyanın birimi uyuşmuyor."));
        var owner = await _units.ResolveWritableAsync(dossier?.OwnerUnitId ?? command.OwnerUnitId, "documents.manage.all", cancellationToken);
        if (owner is null)
            return Result<CreateDocumentResponse>.Failure(Error.Validation("documents.unit_required", "Belge yüklemek için yetkili olduğunuz aktif birim seçilmelidir."));
        if (dossier is not null && !await _unitPlans.IsAssignedAsync(owner.Id, dossier.FilePlanId, dossier.FilePlanItemId, cancellationToken))
            return Result<CreateDocumentResponse>.Failure(Error.Validation("documents.unit_plan_required", "Dijital dosyanın SDP konusu birime atanmamış."));
        document.AssignOwnerUnit(owner.Id, owner.Path);
        if (dossier is not null) document.FileIn(dossier);

        await _documents.AddAsync(document, cancellationToken);

        _outbox.Enqueue(
            new DocumentCreatedIntegrationEvent(
                Guid.CreateVersion7(),
                document.Id.Value,
                document.Title,
                now,
                document.OwnerUnitPath));

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CreateDocumentResponse>.Success(
            new CreateDocumentResponse(document.Id.Value, document.Title));
    }
}
