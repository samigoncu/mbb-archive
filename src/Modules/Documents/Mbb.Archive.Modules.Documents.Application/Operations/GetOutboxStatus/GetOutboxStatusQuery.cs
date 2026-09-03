using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;

public sealed record GetOutboxStatusQuery : IQuery<OutboxStatus>;

public sealed record OutboxStatus(
    long Pending,
    long Processing,
    long Processed,
    long DeadLettered);
