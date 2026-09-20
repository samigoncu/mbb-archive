using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;

public sealed record DispositionChangedIntegrationEvent(Guid EventId, Guid ProcessId, Guid RetentionCaseId,
    Guid DocumentId, string Action, string Operation, string PreviousStatus, string Status, string Actor,
    string Reason, string Reference, long Version, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "retention.disposition-changed.v1";
}

public sealed record LegalHoldChangedIntegrationEvent(Guid EventId, Guid HoldId, Guid RetentionCaseId,
    Guid DocumentId, string Actor, string Operation, string Reason, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "retention.legal-hold-changed.v1";
}
