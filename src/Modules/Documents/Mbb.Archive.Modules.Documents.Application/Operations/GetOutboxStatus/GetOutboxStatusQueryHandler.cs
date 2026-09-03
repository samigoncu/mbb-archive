using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;

public sealed class GetOutboxStatusQueryHandler
    : IQueryHandler<GetOutboxStatusQuery, OutboxStatus>
{
    private readonly IOutboxQueries _queries;
    private readonly TimeProvider _timeProvider;

    public GetOutboxStatusQueryHandler(
        IOutboxQueries queries,
        TimeProvider timeProvider)
    {
        _queries = queries;
        _timeProvider = timeProvider;
    }

    public async Task<Result<OutboxStatus>> Handle(
        GetOutboxStatusQuery query,
        CancellationToken cancellationToken)
    {
        var status = await _queries.GetStatusAsync(
            _timeProvider.GetUtcNow(),
            cancellationToken);

        return Result<OutboxStatus>.Success(status);
    }
}
