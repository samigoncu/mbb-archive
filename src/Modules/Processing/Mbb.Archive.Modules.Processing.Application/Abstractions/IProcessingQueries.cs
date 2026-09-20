using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;

namespace Mbb.Archive.Modules.Processing.Application.Abstractions;

public sealed record ProcessingMonitorItem(Guid Id, Guid DocumentId, Guid DocumentVersionId, string Stage, string MimeType, DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt, string? FailureCode, string? FailureDetail, int? PageCount, bool HasText, bool HasPdf, bool HasOcr);

public interface IProcessingQueries
{
    Task<Mbb.Archive.BuildingBlocks.Application.PagedResult<ProcessingMonitorItem>> ListAsync(Mbb.Archive.BuildingBlocks.Application.PageRequest page, string? stage, CancellationToken ct);
    Task<ProcessingJobDetails?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);
}
