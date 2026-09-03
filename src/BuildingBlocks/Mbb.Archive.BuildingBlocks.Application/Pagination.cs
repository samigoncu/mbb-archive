namespace Mbb.Archive.BuildingBlocks.Application;

public sealed record PageRequest(int Page, int PageSize)
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    public static Result<PageRequest> Create(int page, int pageSize)
    {
        if (page < 1)
        {
            return Result<PageRequest>.Failure(
                Error.Validation("pagination.invalid_page", "Page must be greater than zero."));
        }

        if (pageSize < 1 || pageSize > MaxPageSize)
        {
            return Result<PageRequest>.Failure(
                Error.Validation(
                    "pagination.invalid_page_size",
                    $"Page size must be between 1 and {MaxPageSize}."));
        }

        return Result<PageRequest>.Success(new PageRequest(page, pageSize));
    }
}

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long TotalCount);
