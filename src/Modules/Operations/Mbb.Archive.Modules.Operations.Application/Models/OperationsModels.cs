using Mbb.Archive.BuildingBlocks.Observability;

namespace Mbb.Archive.Modules.Operations.Application.Models;

public sealed record QueueStatus(
    string Name,
    long Ready,
    long Unacknowledged,
    long Total,
    int Consumers,
    bool IsDeadLetterQueue);

public sealed record ExternalDependencyStatus(
    string Name,
    OperationalHealth Health,
    string Detail);

public sealed record OperationsOverview(
    DateTimeOffset CollectedAt,
    OperationalHealth OverallHealth,
    IReadOnlyList<OperationalComponentSnapshot> Components,
    IReadOnlyList<QueueStatus> Queues,
    IReadOnlyList<ExternalDependencyStatus> Dependencies);

public sealed record VerificationRunDetails(
    Guid Id,
    string Kind,
    string RequestedBy,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt,
    long CheckedItems,
    long FailedItems,
    string Summary);

public sealed record RecoveryDrillDetails(
    Guid Id,
    string BackupReference,
    string TargetEnvironment,
    string Status,
    int TargetRpoMinutes,
    int TargetRtoMinutes,
    int? ActualRpoMinutes,
    int? ActualRtoMinutes,
    string EvidenceReference,
    DateTimeOffset PlannedAt,
    DateTimeOffset? CompletedAt, string RequestedBy, DateTimeOffset? StartedAt, string Notes);

public sealed record DailyOperationsReport(
    DateTimeOffset GeneratedAt,
    OperationalHealth OverallHealth,
    long PendingMessages,
    long DeadLetterMessages,
    int UnhealthyComponents,
    int DegradedComponents,
    IReadOnlyList<string> PriorityActions);

public sealed record AlertRuleDetails(Guid Id, string Code, string Metric, string Comparison,
    decimal Threshold, string Severity, TimeSpan EvaluationWindow, bool IsEnabled, string? NotificationChannel, string NotificationTarget, DateTimeOffset? LastEvaluatedAt, string LastEvaluationError);
public sealed record AlertInstanceDetails(Guid Id, Guid RuleId, string DeduplicationKey,
    string Severity, string Status, decimal CurrentValue, int OccurrenceCount,
    DateTimeOffset OpenedAt, DateTimeOffset LastObservedAt, DateTimeOffset? ResolvedAt, string? AcknowledgedBy, string? AcknowledgementNote);
