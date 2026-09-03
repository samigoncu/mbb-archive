using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Models;
using Mbb.Archive.Modules.Operations.Infrastructure.Probes;

namespace Mbb.Archive.Modules.Operations.Infrastructure;

internal sealed class OperationsOverviewProvider :
    IOperationsOverviewProvider
{
    private readonly IEnumerable<IOperationalSnapshotContributor> _contributors;
    private readonly RabbitMqManagementProbe _rabbitMq;
    private readonly OpenSearchProbe _openSearch;
    private readonly TimeProvider _timeProvider;

    public OperationsOverviewProvider(
        IEnumerable<IOperationalSnapshotContributor> contributors,
        RabbitMqManagementProbe rabbitMq,
        OpenSearchProbe openSearch,
        TimeProvider timeProvider)
    {
        _contributors = contributors;
        _rabbitMq = rabbitMq;
        _openSearch = openSearch;
        _timeProvider = timeProvider;
    }

    public async Task<OperationsOverview> GetOverviewAsync(
        CancellationToken cancellationToken)
    {
        var components = new List<OperationalComponentSnapshot>();

        foreach (var contributor in _contributors.OrderBy(x => x.Component))
        {
            try
            {
                components.Add(
                    await contributor.CollectAsync(cancellationToken));
            }
            catch (Exception ex)
            {
                components.Add(
                    new OperationalComponentSnapshot(
                        contributor.Component,
                        OperationalHealth.Unhealthy,
                        _timeProvider.GetUtcNow(),
                        [],
                        [
                            new OperationalIssue(
                                OperationalHealth.Unhealthy,
                                "operations.snapshot_failed",
                                ex.Message)
                        ]));
            }
        }

        var rabbit = await _rabbitMq.ProbeAsync(cancellationToken);
        var openSearch = await _openSearch.ProbeAsync(cancellationToken);

        var dependencies = new[]
        {
            rabbit.Status,
            openSearch
        };

        var overall = CalculateOverall(
            components.Select(x => x.Health)
                .Concat(dependencies.Select(x => x.Health)));

        return new OperationsOverview(
            _timeProvider.GetUtcNow(),
            overall,
            components,
            rabbit.Queues,
            dependencies);
    }

    private static OperationalHealth CalculateOverall(
        IEnumerable<OperationalHealth> values)
    {
        var statuses = values.ToArray();

        if (statuses.Any(x => x == OperationalHealth.Unhealthy))
            return OperationalHealth.Unhealthy;

        if (statuses.Any(x => x == OperationalHealth.Degraded))
            return OperationalHealth.Degraded;

        if (statuses.Length == 0
            || statuses.All(x => x == OperationalHealth.Unknown))
        {
            return OperationalHealth.Unknown;
        }

        return OperationalHealth.Healthy;
    }
}
