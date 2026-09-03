using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.Create;
public sealed class CreateFilePlanCommandHandler : ICommandHandler<CreateFilePlanCommand,Guid>
{
    private readonly IClassificationRepository _repository; private readonly IUnitOfWork<ClassificationBoundary> _unitOfWork;
    public CreateFilePlanCommandHandler(IClassificationRepository repository,IUnitOfWork<ClassificationBoundary> unitOfWork){_repository=repository;_unitOfWork=unitOfWork;}
    public async Task<Result<Guid>> Handle(CreateFilePlanCommand command,CancellationToken ct)
    {
        try
        {
            var plan=FilePlan.Create(command.Code,command.Name,command.Version,command.Authority,command.EffectiveFrom,command.EffectiveTo);
            await _repository.AddFilePlanAsync(plan,ct); await _unitOfWork.SaveChangesAsync(ct); return Result<Guid>.Success(plan.Id.Value);
        }
        catch(DomainRuleViolationException ex){return Result<Guid>.Failure(Error.Validation("classification.file_plan_invalid",ex.Message));}
    }
}
