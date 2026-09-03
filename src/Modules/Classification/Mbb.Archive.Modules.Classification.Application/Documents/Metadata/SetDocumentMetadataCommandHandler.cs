using Mbb.Archive.Modules.Classification.Application;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.Application.Documents.Metadata;

public sealed class SetDocumentMetadataCommandHandler
    : ICommandHandler<SetDocumentMetadataCommand, Guid>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly IClassificationRepository _repository;
    private readonly IOutbox<ClassificationBoundary> _outbox;
    private readonly IUnitOfWork<ClassificationBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public SetDocumentMetadataCommandHandler(
        IClassificationRepository repository,
        IOutbox<ClassificationBoundary> outbox,
        IUnitOfWork<ClassificationBoundary> unitOfWork,
        TimeProvider timeProvider)
    {
        _repository = repository;
        _outbox = outbox;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<Result<Guid>> Handle(
        SetDocumentMetadataCommand command,
        CancellationToken cancellationToken)
    {
        var schema = await _repository.GetSchemaAsync(
            new MetadataSchemaId(command.SchemaId),
            cancellationToken);

        if (schema is null)
        {
            return Result<Guid>.Failure(
                Error.NotFound(
                    "classification.schema_not_found",
                    "Metadata schema was not found."));
        }

        var validation = MetadataValueValidator.Validate(
            schema,
            command.Values);

        if (validation is not null)
            return Result<Guid>.Failure(validation);

        var valuesJson = JsonSerializer.Serialize(command.Values, JsonOptions);
        var now = _timeProvider.GetUtcNow();

        var set = await _repository.GetMetadataSetAsync(
            command.DocumentId,
            schema.Id,
            cancellationToken);

        if (set is null)
        {
            set = DocumentMetadataSet.Create(
                command.DocumentId,
                schema.Id,
                schema.Version,
                valuesJson,
                now);

            await _repository.AddMetadataSetAsync(set, cancellationToken);
        }
        else
        {
            set.ReplaceValues(valuesJson, now);
        }

        _outbox.Enqueue(
            new DocumentMetadataChangedIntegrationEvent(
                Guid.CreateVersion7(),
                command.DocumentId,
                schema.Id.Value,
                schema.Key,
                schema.Name,
                schema.Version,
                valuesJson,
                now));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(set.Id.Value);
    }
}
