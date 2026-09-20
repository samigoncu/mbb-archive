using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Application.Projection;

public sealed record ApplyDocumentCreatedCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    string Title,
    DateTimeOffset OccurredAt,
    string? OwnerUnitPath = null) : ICommand;
