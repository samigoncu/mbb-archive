using Mbb.Archive.Modules.Search.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Domain.Documents;

namespace Mbb.Archive.Modules.Search.Application.Projection;

public sealed class SearchProjectionHandler :
    ICommandHandler<ApplyDocumentCreatedCommand>,
    ICommandHandler<ApplyProcessingReadyCommand>,
    ICommandHandler<ApplyClassificationCommand>,
    ICommandHandler<ApplyMetadataCommand>
{
    private readonly ISearchDocumentRepository _documents;
    private readonly IInbox<SearchBoundary> _inbox;
    private readonly IUnitOfWork<SearchBoundary> _unitOfWork;

    public SearchProjectionHandler(
        ISearchDocumentRepository documents,
        IInbox<SearchBoundary> inbox,
        IUnitOfWork<SearchBoundary> unitOfWork)
    {
        _documents = documents;
        _inbox = inbox;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(
        ApplyDocumentCreatedCommand command,
        CancellationToken cancellationToken)
    {
        if (await IsProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var document = await _documents.GetAsync(command.DocumentId, cancellationToken);

        if (document is null)
        {
            document = SearchDocument.Create(
                command.DocumentId,
                command.Title,
                command.OccurredAt);
            await _documents.AddAsync(document, cancellationToken);
        }
        else
        {
            document.EnsureTitle(command.Title, command.OccurredAt);
        }

        return await PersistAsync(
            command.MessageId,
            command.EventName,
            command.OccurredAt,
            document,
            cancellationToken);
    }

    public async Task<Result> Handle(
        ApplyProcessingReadyCommand command,
        CancellationToken cancellationToken)
    {
        if (await IsProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var document = await RequireProjectionAsync(command.DocumentId, cancellationToken);
        if (document is null)
            return MissingDocument();

        document.ApplyProcessing(
            command.DocumentVersionId,
            mimeType: null,
            command.TextArtifactStorageKey,
            command.OcrJsonArtifactStorageKey,
            command.OccurredAt);

        return await PersistAsync(
            command.MessageId,
            command.EventName,
            command.OccurredAt,
            document,
            cancellationToken);
    }

    public async Task<Result> Handle(
        ApplyClassificationCommand command,
        CancellationToken cancellationToken)
    {
        if (await IsProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var document = await RequireProjectionAsync(command.DocumentId, cancellationToken);
        if (document is null)
            return MissingDocument();

        document.UpsertClassification(
            command.FilePlanCode,
            command.FilePlanName,
            command.ItemCode,
            command.ItemTitle,
            command.IsPrimary,
            command.OccurredAt);

        return await PersistAsync(
            command.MessageId,
            command.EventName,
            command.OccurredAt,
            document,
            cancellationToken);
    }

    public async Task<Result> Handle(
        ApplyMetadataCommand command,
        CancellationToken cancellationToken)
    {
        if (await IsProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var document = await RequireProjectionAsync(command.DocumentId, cancellationToken);
        if (document is null)
            return MissingDocument();

        document.ReplaceMetadataSchema(
            command.SchemaKey,
            command.SchemaName,
            command.SchemaVersion,
            command.ValuesJson,
            command.OccurredAt);

        return await PersistAsync(
            command.MessageId,
            command.EventName,
            command.OccurredAt,
            document,
            cancellationToken);
    }

    private Task<bool> IsProcessedAsync(
        Guid messageId,
        CancellationToken cancellationToken)
        => _inbox.HasProcessedAsync(messageId, cancellationToken);

    private Task<SearchDocument?> RequireProjectionAsync(
        Guid documentId,
        CancellationToken cancellationToken)
        => _documents.GetAsync(documentId, cancellationToken);

    private async Task<Result> PersistAsync(
        Guid messageId,
        string eventName,
        DateTimeOffset occurredAt,
        SearchDocument document,
        CancellationToken cancellationToken)
    {
        _documents.RequestIndex(
            document.Id,
            document.Revision,
            occurredAt);

        _inbox.MarkProcessed(messageId, eventName, occurredAt);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static Result MissingDocument()
        => Result.Failure(
            Error.Conflict(
                "search.projection_missing",
                "Search projection is missing. The document-created event must be applied first."));
}
