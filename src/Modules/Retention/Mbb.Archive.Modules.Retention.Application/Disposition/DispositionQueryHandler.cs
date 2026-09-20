using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public sealed class DispositionQueryHandler(IDispositionRepository repository, IDocumentVisibility visibility)
{
    public async Task<Result<PagedResult<DispositionDetails>>> List(int page, int pageSize, string? status, CancellationToken ct)
    {
        var request = PageRequest.Create(page, pageSize);
        if (request.IsFailure) return Result<PagedResult<DispositionDetails>>.Failure(request.Error);
        if (!string.IsNullOrEmpty(status) && !Enum.TryParse<Domain.Disposition.DispositionProcessStatus>(status, out _))
            return Result<PagedResult<DispositionDetails>>.Failure(Error.Validation("retention.invalid_status", "Geçersiz durum filtresi."));
        var result = await repository.ListAsync(request.Value, status, ct);
        return Result<PagedResult<DispositionDetails>>.Success(new PagedResult<DispositionDetails>(
            result.Items.Select(DispositionDetails.From).ToArray(), result.Page, result.PageSize, result.TotalCount));
    }
    public async Task<Result<DispositionDetails>> Get(Guid id, CancellationToken ct)
    {
        var process = await repository.GetAsync(id, ct);
        return process is null || !(await visibility.FilterAsync([process.DocumentId], ct)).Contains(process.DocumentId) ? Result<DispositionDetails>.Failure(Error.NotFound("retention.process_not_found", "İşlem bulunamadı."))
            : Result<DispositionDetails>.Success(DispositionDetails.From(process));
    }
}
