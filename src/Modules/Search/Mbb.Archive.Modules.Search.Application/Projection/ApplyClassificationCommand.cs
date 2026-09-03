using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Application.Projection;

public sealed record ApplyClassificationCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    string FilePlanCode,
    string FilePlanName,
    string ItemCode,
    string ItemTitle,
    bool IsPrimary,
    DateTimeOffset OccurredAt) : ICommand;
