using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
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
    private readonly TimeProvider _timeProvider;

    public CreateDocumentCommandHandler(
        IDocumentRepository documents,
        IOutbox<DocumentsBoundary> outbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _documents = documents;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
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

        await _documents.AddAsync(document, cancellationToken);

        _outbox.Enqueue(
            new DocumentCreatedIntegrationEvent(
                Guid.CreateVersion7(),
                document.Id.Value,
                document.Title,
                now));

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CreateDocumentResponse>.Success(
            new CreateDocumentResponse(document.Id.Value, document.Title));
    }
}
