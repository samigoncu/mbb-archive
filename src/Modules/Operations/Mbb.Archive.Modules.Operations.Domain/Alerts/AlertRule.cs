using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Alerts;

public enum AlertSeverity { Info, Warning, Critical }
public enum AlertStatus { Open, Acknowledged, Resolved, Suppressed }
public enum AlertComparison { GreaterThan, GreaterThanOrEqual, Equal, LessThan }

public sealed class AlertRule : AggregateRoot<Guid>
{
    private AlertRule() { }

    private AlertRule(string code, string metric, AlertComparison comparison, decimal threshold,
        AlertSeverity severity, TimeSpan evaluationWindow, DateTimeOffset now) : base(Guid.CreateVersion7())
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(metric))
            throw new DomainRuleViolationException("Alert rule code and metric are required.");
        if (threshold < 0 || evaluationWindow <= TimeSpan.Zero)
            throw new DomainRuleViolationException("Alert threshold and evaluation window are invalid.");
        Code = code.Trim().ToLowerInvariant(); Metric = metric.Trim(); Comparison = comparison;
        Threshold = threshold; Severity = severity; EvaluationWindow = evaluationWindow; IsEnabled = true;
        CreatedAt = now; UpdatedAt = now;
    }

    public string Code { get; private set; } = string.Empty;
    public string Metric { get; private set; } = string.Empty;
    public AlertComparison Comparison { get; private set; }
    public decimal Threshold { get; private set; }
    public AlertSeverity Severity { get; private set; }
    public TimeSpan EvaluationWindow { get; private set; }
    public bool IsEnabled { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static AlertRule Create(string code, string metric, AlertComparison comparison,
        decimal threshold, AlertSeverity severity, TimeSpan evaluationWindow, DateTimeOffset now)
        => new(code, metric, comparison, threshold, severity, evaluationWindow, now);

    public bool IsTriggered(decimal value) => IsEnabled && Comparison switch
    {
        AlertComparison.GreaterThan => value > Threshold,
        AlertComparison.GreaterThanOrEqual => value >= Threshold,
        AlertComparison.Equal => value == Threshold,
        AlertComparison.LessThan => value < Threshold,
        _ => false
    };

    public void Reconfigure(decimal threshold, AlertSeverity severity, TimeSpan window, DateTimeOffset now)
    {
        if (threshold < 0 || window <= TimeSpan.Zero)
            throw new DomainRuleViolationException("Alert threshold and evaluation window are invalid.");
        Threshold = threshold; Severity = severity; EvaluationWindow = window; UpdatedAt = now;
    }

    public void SetEnabled(bool enabled, DateTimeOffset now) { IsEnabled = enabled; UpdatedAt = now; }
}
