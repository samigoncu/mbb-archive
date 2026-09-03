using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.AddField;
public sealed class AddMetadataFieldCommandHandler : ICommandHandler<AddMetadataFieldCommand,Guid>
{
    private readonly IClassificationRepository _repository; private readonly IUnitOfWork<ClassificationBoundary> _uow;
    public AddMetadataFieldCommandHandler(IClassificationRepository repository,IUnitOfWork<ClassificationBoundary> uow){_repository=repository;_uow=uow;}
    public async Task<Result<Guid>> Handle(AddMetadataFieldCommand command,CancellationToken ct)
    {
        var schema=await _repository.GetSchemaAsync(new MetadataSchemaId(command.SchemaId),ct);if(schema is null)return Result<Guid>.Failure(Error.NotFound("classification.schema_not_found","Metadata schema was not found."));
        try{var field=schema.AddField(command.Key,command.Label,command.FieldType,command.IsRequired,command.IsSearchable,command.IsRepeatable,command.OptionsJson);await _uow.SaveChangesAsync(ct);return Result<Guid>.Success(field.Id);}
        catch(DomainRuleViolationException ex){return Result<Guid>.Failure(Error.Validation("classification.field_invalid",ex.Message));}
    }
}
