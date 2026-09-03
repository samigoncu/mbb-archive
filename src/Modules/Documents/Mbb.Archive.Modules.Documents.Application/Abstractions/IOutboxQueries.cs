using Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IOutboxQueries
{
    Task<OutboxStatus> GetStatusAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken);
}
