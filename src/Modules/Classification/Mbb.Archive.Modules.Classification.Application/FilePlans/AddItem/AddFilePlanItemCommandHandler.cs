using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.AddItem;
public sealed class AddFilePlanItemCommandHandler : ICommandHandler<AddFilePlanItemCommand,Guid>
{
    private readonly IClassificationRepository _repository; private readonly IUnitOfWork<ClassificationBoundary> _unitOfWork;
    public AddFilePlanItemCommandHandler(IClassificationRepository repository,IUnitOfWork<ClassificationBoundary> unitOfWork){_repository=repository;_unitOfWork=unitOfWork;}
    public async Task<Result<Guid>> Handle(AddFilePlanItemCommand command,CancellationToken ct)
    {
        var plan=await _repository.GetFilePlanAsync(new FilePlanId(command.FilePlanId),ct);
        if(plan is null)return Result<Guid>.Failure(Error.NotFound("classification.file_plan_not_found","File plan was not found."));
        try
        {
            var item=plan.AddItem(command.ParentId is null?null:new FilePlanItemId(command.ParentId.Value),command.Code,command.Title,command.Level,command.IsSelectable);
            item.Rename(command.Title, command.Description);
            await _unitOfWork.SaveChangesAsync(ct); return Result<Guid>.Success(item.Id.Value);
        }
        catch(DomainRuleViolationException ex){return Result<Guid>.Failure(Error.Validation("classification.file_plan_item_invalid",ex.Message));}
    }
}
