using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed record FailProcessingCommand(Guid MessageId,string EventName,Guid ProcessingJobId,string FailureCode,string FailureDetail,DateTimeOffset OccurredAt) : ICommand;
