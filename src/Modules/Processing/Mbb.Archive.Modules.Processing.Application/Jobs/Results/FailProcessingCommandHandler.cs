using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed class FailProcessingCommandHandler : ICommandHandler<FailProcessingCommand>
{
    private readonly IProcessingJobRepository _jobs; private readonly IInbox<ProcessingBoundary> _inbox; private readonly IUnitOfWork<ProcessingBoundary> _uow;
    public FailProcessingCommandHandler(IProcessingJobRepository jobs,IInbox<ProcessingBoundary> inbox,IUnitOfWork<ProcessingBoundary> uow){_jobs=jobs;_inbox=inbox;_uow=uow;}
    public async Task<Result> Handle(FailProcessingCommand command,CancellationToken ct)
    {
        if(await _inbox.HasProcessedAsync(command.MessageId,ct)) return Result.Success();
        var job=await _jobs.GetByIdAsync(new ProcessingJobId(command.ProcessingJobId),ct); if(job is null) return Result.Failure(ProcessingResultErrors.JobNotFound);
        try{job.MarkFailed(command.FailureCode,command.FailureDetail);_inbox.MarkProcessed(command.MessageId,command.EventName,command.OccurredAt);await _uow.SaveChangesAsync(ct);return Result.Success();}
        catch(DomainRuleViolationException ex){return Result.Failure(ProcessingResultErrors.Conflict(ex.Message));}
    }
}
