using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
public sealed record MarkSearchIndexedCommand(Guid MessageId,string EventName,Guid DocumentId,Guid? DocumentVersionId,DateTimeOffset OccurredAt):ICommand;
