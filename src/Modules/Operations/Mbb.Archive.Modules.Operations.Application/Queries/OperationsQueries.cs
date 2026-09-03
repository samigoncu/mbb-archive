using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Abstractions;
using Mbb.Archive.Modules.Operations.Application.Models;

namespace Mbb.Archive.Modules.Operations.Application.Queries;

public sealed record GetOperationsOverviewQuery
    : IQuery<OperationsOverview>;

public sealed record GetVerificationRunsQuery(int Take)
    : IQuery<IReadOnlyList<VerificationRunDetails>>;

public sealed record GetRecoveryDrillsQuery(int Take)
    : IQuery<IReadOnlyList<RecoveryDrillDetails>>;

public sealed record GetDailyOperationsReportQuery
    : IQuery<DailyOperationsReport>;

public sealed class OperationsQueryHandlers :
    IQueryHandler<GetOperationsOverviewQuery, OperationsOverview>,
    IQueryHandler<GetVerificationRunsQuery, IReadOnlyList<VerificationRunDetails>>,
    IQueryHandler<GetRecoveryDrillsQuery, IReadOnlyList<RecoveryDrillDetails>>,
    IQueryHandler<GetDailyOperationsReportQuery, DailyOperationsReport>
{
    private readonly IOperationsOverviewProvider _overview;
    private readonly IOperationsQueries _queries;

    public OperationsQueryHandlers(
        IOperationsOverviewProvider overview,
        IOperationsQueries queries)
    {
        _overview = overview;
        _queries = queries;
    }

    public async Task<Result<OperationsOverview>> Handle(
        GetOperationsOverviewQuery query,
        CancellationToken cancellationToken)
        => Result<OperationsOverview>.Success(
            await _overview.GetOverviewAsync(cancellationToken));

    public async Task<Result<IReadOnlyList<VerificationRunDetails>>> Handle(
        GetVerificationRunsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<VerificationRunDetails>>.Success(
            await _queries.ListVerificationRunsAsync(
                Math.Clamp(query.Take, 1, 200),
                cancellationToken));

    public async Task<Result<IReadOnlyList<RecoveryDrillDetails>>> Handle(
        GetRecoveryDrillsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<RecoveryDrillDetails>>.Success(
            await _queries.ListRecoveryDrillsAsync(
                Math.Clamp(query.Take, 1, 200),
                cancellationToken));

    public async Task<Result<DailyOperationsReport>> Handle(
        GetDailyOperationsReportQuery query,
        CancellationToken cancellationToken)
    {
        var overview = await _overview.GetOverviewAsync(cancellationToken);

        var pending = overview.Queues.Sum(x => x.Ready);
        var dead = overview.Queues
            .Where(x => x.IsDeadLetterQueue)
            .Sum(x => x.Total);

        var unhealthy = overview.Components.Count(
            x => x.Health == OperationalHealth.Unhealthy);

        var degraded = overview.Components.Count(
            x => x.Health == OperationalHealth.Degraded);

        var actions = new List<string>();

        if (dead > 0)
            actions.Add("Dead-letter queues contain messages; triage and replay only after root cause is understood.");

        if (unhealthy > 0)
            actions.Add("Resolve unhealthy bounded contexts before non-critical changes.");

        if (degraded > 0)
            actions.Add("Review degraded components and SLA/backlog trends.");

        if (actions.Count == 0)
            actions.Add("No urgent operational action detected.");

        return Result<DailyOperationsReport>.Success(
            new DailyOperationsReport(
                overview.CollectedAt,
                overview.OverallHealth,
                pending,
                dead,
                unhealthy,
                degraded,
                actions));
    }
}
