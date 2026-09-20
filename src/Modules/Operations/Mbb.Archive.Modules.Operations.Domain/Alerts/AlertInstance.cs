using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Alerts;

public sealed record AlertAcknowledgement(string Subject, string Note, DateTimeOffset AcknowledgedAt);
public sealed record AlertEscalation(string Target, AlertSeverity Severity, DateTimeOffset EscalatedAt);

public sealed class AlertInstance : AggregateRoot<Guid>
{
    private AlertInstance() { }
    private AlertInstance(Guid ruleId, string deduplicationKey, AlertSeverity severity, decimal value,
        DateTimeOffset now) : base(Guid.CreateVersion7())
    {
        if (string.IsNullOrWhiteSpace(deduplicationKey))
            throw new DomainRuleViolationException("Alert deduplication key is required.");
        RuleId = ruleId; DeduplicationKey = deduplicationKey.Trim(); Severity = severity;
        CurrentValue = value; Status = AlertStatus.Open; OpenedAt = now; LastObservedAt = now;
    }

    public Guid RuleId { get; private set; }
    public string DeduplicationKey { get; private set; } = string.Empty;
    public AlertSeverity Severity { get; private set; }
    public AlertStatus Status { get; private set; }
    public decimal CurrentValue { get; private set; }
    public int OccurrenceCount { get; private set; } = 1;
    public DateTimeOffset OpenedAt { get; private set; }
    public DateTimeOffset LastObservedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public AlertAcknowledgement? Acknowledgement { get; private set; }
    public IReadOnlyList<AlertEscalation> Escalations => _escalations;
    private readonly List<AlertEscalation> _escalations = [];

    public static AlertInstance Open(Guid ruleId, string key, AlertSeverity severity,
        decimal value, DateTimeOffset now) => new(ruleId, key, severity, value, now);

    public void Observe(decimal value, AlertSeverity severity, DateTimeOffset now)
    {
        CurrentValue = value; Severity = severity; LastObservedAt = now; OccurrenceCount++;
        if (Status == AlertStatus.Resolved) { Status = AlertStatus.Open; OpenedAt = now; ResolvedAt = null; Acknowledgement = null; }
    }

    public void Acknowledge(string subject, string note, DateTimeOffset now)
    {
        if (Status != AlertStatus.Open) throw new DomainRuleViolationException("Only an open alert can be acknowledged.");
        if (string.IsNullOrWhiteSpace(subject)) throw new DomainRuleViolationException("Acknowledging subject is required.");
        if (subject.Length > 300 || (note?.Length ?? 0) > 2000) throw new DomainRuleViolationException("Üstlenen kimlik veya not çok uzun.");
        Acknowledgement = new(subject.Trim(), note?.Trim() ?? string.Empty, now); Status = AlertStatus.Acknowledged;
    }

    public void Resolve(DateTimeOffset now)
    {
        if (Status == AlertStatus.Resolved) return;
        Status = AlertStatus.Resolved; ResolvedAt = now;
    }

    public void Suppress(DateTimeOffset now) { Status = AlertStatus.Suppressed; LastObservedAt = now; }
    public void Escalate(string target, AlertSeverity severity, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(target)) throw new DomainRuleViolationException("Escalation target is required.");
        _escalations.Add(new(target.Trim(), severity, now));
    }
}
