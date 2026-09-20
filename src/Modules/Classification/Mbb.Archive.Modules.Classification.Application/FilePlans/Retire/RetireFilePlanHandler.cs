using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;

namespace Mbb.Archive.Modules.Classification.Application.FilePlans.Retire;

public sealed class RetireFilePlanHandler(IClassificationRepository repository,
    IUnitOfWork<ClassificationBoundary> unitOfWork)
{
    public async Task<Result> Handle(Guid id, CancellationToken cancellationToken)
    {
        var plan = await repository.GetFilePlanAsync(new FilePlanId(id), cancellationToken);
        if (plan is null)
            return Result.Failure(Error.NotFound("classification.file_plan_not_found", "Dosya planı bulunamadı."));
        plan.Retire();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
