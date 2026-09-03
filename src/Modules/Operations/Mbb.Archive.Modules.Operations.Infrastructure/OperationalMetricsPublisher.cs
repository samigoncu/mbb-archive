using System.Diagnostics.Metrics;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Models;

namespace Mbb.Archive.Modules.Operations.Infrastructure;

internal sealed class OperationalMetricsPublisher :
    BackgroundService,
    IDisposable
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _timeProvider;
    private readonly Meter _meter = new("Mbb.Archive.Operations");
    private readonly object _sync = new();
    private IReadOnlyList<Measurement<double>> _measurements = [];
    private IReadOnlyDictionary<string, double> _named = new Dictionary<string, double>();

    public OperationalMetricsPublisher(
        IServiceScopeFactory scopeFactory,
        TimeProvider timeProvider)
    {
        _scopeFactory = scopeFactory;
        _timeProvider = timeProvider;

        _meter.CreateObservableGauge(
            "mbb.archive.operations.value",
            Observe,
            unit: "{item}",
            description: "Operational command-center gauges.");

        foreach (var name in MetricNames)
            _meter.CreateObservableGauge(name, () => ObserveNamed(name), description: "Operations intelligence gauge.");
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var overviewProvider = scope.ServiceProvider.GetRequiredService<IOperationsOverviewProvider>();
            var overview = await overviewProvider.GetOverviewAsync(stoppingToken);

            var measurements = new List<Measurement<double>>();

            foreach (var component in overview.Components)
            {
                foreach (var item in component.Measurements)
                {
                    measurements.Add(
                        new Measurement<double>(
                            item.Value,
                            new KeyValuePair<string, object?>("component", component.Component),
                            new KeyValuePair<string, object?>("metric", item.Name)));
                }
            }

            measurements.Add(
                new Measurement<double>(
                    overview.Queues.Sum(x => x.Ready),
                    new KeyValuePair<string, object?>("component", "rabbitmq"),
                    new KeyValuePair<string, object?>("metric", "messages_ready")));

            measurements.Add(
                new Measurement<double>(
                    overview.Queues.Where(x => x.IsDeadLetterQueue).Sum(x => x.Total),
                    new KeyValuePair<string, object?>("component", "rabbitmq"),
                    new KeyValuePair<string, object?>("metric", "dead_letter_messages")));

            lock (_sync)
            {
                _measurements = measurements;
                _named = BuildNamedMeasurements(overview);
            }

            await Task.Delay(
                TimeSpan.FromSeconds(15),
                _timeProvider,
                stoppingToken);
        }
    }

    private IEnumerable<Measurement<double>> Observe()
    {
        lock (_sync)
            return _measurements.ToArray();
    }

    private double ObserveNamed(string name)
    {
        lock (_sync) return _named.GetValueOrDefault(name);
    }

    private static IReadOnlyDictionary<string, double> BuildNamedMeasurements(OperationsOverview overview)
    {
        double ComponentValue(string metric) => overview.Components.SelectMany(x => x.Measurements)
            .Where(x => x.Name.Equals(metric, StringComparison.OrdinalIgnoreCase)).Sum(x => x.Value);
        return new Dictionary<string, double>
        {
            ["alert_open_total"] = 0, ["alert_critical_total"] = 0, ["notification_failure_total"] = 0,
            ["dlq_messages"] = overview.Queues.Where(x => x.IsDeadLetterQueue).Sum(x => x.Total),
            ["processing_backlog"] = ComponentValue("processing_backlog"), ["search_backlog"] = ComponentValue("search_backlog"),
            ["workflow_sla_overdue"] = ComponentValue("workflow_sla_overdue"), ["fixity_failure_total"] = ComponentValue("fixity_failures"),
            ["audit_integrity_failure_total"] = ComponentValue("audit_integrity_failures"), ["storage_utilization"] = ComponentValue("storage_utilization"),
            ["storage_growth_bytes_per_day"] = ComponentValue("storage_growth_bytes_per_day"), ["recovery_drill_failure_total"] = ComponentValue("recovery_drill_failures")
        };
    }

    private static readonly string[] MetricNames = ["alert_open_total", "alert_critical_total", "notification_failure_total",
        "dlq_messages", "processing_backlog", "search_backlog", "workflow_sla_overdue", "fixity_failure_total",
        "audit_integrity_failure_total", "storage_utilization", "storage_growth_bytes_per_day", "recovery_drill_failure_total"];

    public override void Dispose()
    {
        _meter.Dispose();
        base.Dispose();
    }
}
