using Mbb.Archive.Modules.Processing.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed class MarkSearchIndexedCommandHandler:ICommandHandler<MarkSearchIndexedCommand>
{
    private readonly IProcessingJobRepository _jobs;private readonly IInbox<ProcessingBoundary> _inbox;private readonly IUnitOfWork<ProcessingBoundary> _uow;
    public MarkSearchIndexedCommandHandler(IProcessingJobRepository jobs,IInbox<ProcessingBoundary> inbox,IUnitOfWork<ProcessingBoundary> uow){_jobs=jobs;_inbox=inbox;_uow=uow;}
    public async Task<Result> Handle(MarkSearchIndexedCommand command,CancellationToken ct){if(await _inbox.HasProcessedAsync(command.MessageId,ct))return Result.Success();if(command.DocumentVersionId is null){_inbox.MarkProcessed(command.MessageId,command.EventName,command.OccurredAt);await _uow.SaveChangesAsync(ct);return Result.Success();}var job=await _jobs.GetByDocumentVersionIdAsync(command.DocumentVersionId.Value,ct);if(job is null)return Result.Failure(Error.NotFound("processing.job_not_found","Processing job was not found for indexed version."));try{job.MarkIndexed(command.OccurredAt);_inbox.MarkProcessed(command.MessageId,command.EventName,command.OccurredAt);await _uow.SaveChangesAsync(ct);return Result.Success();}catch(DomainRuleViolationException ex){return Result.Failure(Error.Conflict("processing.index_state_conflict",ex.Message));}}
}
