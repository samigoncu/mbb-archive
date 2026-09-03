using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.Create;
public sealed class CreateMetadataSchemaCommandHandler : ICommandHandler<CreateMetadataSchemaCommand,Guid>
{
    private readonly IClassificationRepository _repository; private readonly IUnitOfWork<ClassificationBoundary> _uow; private readonly TimeProvider _time;
    public CreateMetadataSchemaCommandHandler(IClassificationRepository repository,IUnitOfWork<ClassificationBoundary> uow,TimeProvider time){_repository=repository;_uow=uow;_time=time;}
    public async Task<Result<Guid>> Handle(CreateMetadataSchemaCommand command,CancellationToken ct)
    {
        try{var schema=MetadataSchema.Create(command.Key,command.Name,command.Version,_time.GetUtcNow());await _repository.AddSchemaAsync(schema,ct);await _uow.SaveChangesAsync(ct);return Result<Guid>.Success(schema.Id.Value);}
        catch(DomainRuleViolationException ex){return Result<Guid>.Failure(Error.Validation("classification.schema_invalid",ex.Message));}
    }
}
