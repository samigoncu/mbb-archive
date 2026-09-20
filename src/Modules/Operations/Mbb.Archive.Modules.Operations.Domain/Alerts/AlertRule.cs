using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Channel = Mbb.Archive.Modules.Operations.Domain.Notifications.NotificationChannel;

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
        if (threshold < 0 || evaluationWindow <= TimeSpan.Zero || evaluationWindow > TimeSpan.FromDays(1) || !Enum.IsDefined(comparison) || !Enum.IsDefined(severity))
            throw new DomainRuleViolationException("Alert threshold and evaluation window are invalid.");
        if (code.Length > 150 || metric.Length > 200) throw new DomainRuleViolationException("Alarm kodu veya ölçüm adı çok uzun.");
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
    public DateTimeOffset? BreachedSince { get; private set; }
    public DateTimeOffset? LastEvaluatedAt { get; private set; }
    public string LastEvaluationError { get; private set; } = string.Empty;
    public NotificationChannel? NotificationChannel { get; private set; }
    public string NotificationTarget { get; private set; } = string.Empty;

    public void SetNotification(NotificationChannel? channel, string? target)
    {
        if (channel is null) { NotificationChannel = null; NotificationTarget = string.Empty; return; }
        if (channel is not (Channel.Email or Channel.Webhook))
            throw new DomainRuleViolationException("Yalnız e-posta ve webhook bildirimi desteklenir.");
        if (string.IsNullOrWhiteSpace(target) || target.Length > 1000)
            throw new DomainRuleViolationException("Bildirim hedefi zorunludur.");
        if (channel == Channel.Webhook &&
            (!Uri.TryCreate(target, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !string.IsNullOrEmpty(uri.UserInfo)))
            throw new DomainRuleViolationException("Webhook hedefi kimlik bilgisi içermeyen HTTPS adresi olmalıdır.");
        if (channel == Channel.Email &&
            (!System.Net.Mail.MailAddress.TryCreate(target, out var address) || address.Address != target.Trim()))
            throw new DomainRuleViolationException("Geçerli bir e-posta adresi girin.");
        NotificationChannel = channel; NotificationTarget = target.Trim();
    }

    public bool Evaluate(decimal value, DateTimeOffset now)
    {
        // A missed interval cannot count as continuous evidence of a breach.
        if (LastEvaluatedAt is { } previous && now - previous > TimeSpan.FromMinutes(2)) BreachedSince = null;
        LastEvaluatedAt = now; LastEvaluationError = string.Empty;
        if (!IsTriggered(value)) { BreachedSince = null; return false; }
        BreachedSince ??= now;
        return now - BreachedSince >= EvaluationWindow;
    }

    public void MissingMeasurement(string? reason = null) { BreachedSince = null; LastEvaluatedAt = null; LastEvaluationError = reason ?? string.Empty; }

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
