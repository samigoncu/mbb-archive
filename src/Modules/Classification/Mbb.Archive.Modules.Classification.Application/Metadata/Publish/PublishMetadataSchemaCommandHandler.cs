using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.Publish;
public sealed class PublishMetadataSchemaCommandHandler : ICommandHandler<PublishMetadataSchemaCommand>
{
    private readonly IClassificationRepository _repository;private readonly IUnitOfWork<ClassificationBoundary> _uow;private readonly TimeProvider _time;
    public PublishMetadataSchemaCommandHandler(IClassificationRepository repository,IUnitOfWork<ClassificationBoundary> uow,TimeProvider time){_repository=repository;_uow=uow;_time=time;}
    public async Task<Result> Handle(PublishMetadataSchemaCommand command,CancellationToken ct)
    {
        var schema=await _repository.GetSchemaAsync(new MetadataSchemaId(command.SchemaId),ct);if(schema is null)return Result.Failure(Error.NotFound("classification.schema_not_found","Metadata schema was not found."));
        try{schema.Publish(_time.GetUtcNow());await _uow.SaveChangesAsync(ct);return Result.Success();}
        catch(DomainRuleViolationException ex){return Result.Failure(Error.Conflict("classification.schema_publish_conflict",ex.Message));}
    }
}
