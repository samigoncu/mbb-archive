using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

namespace Mbb.Archive.Modules.PhysicalArchive.Application.Queries;

public sealed record GetLocationTreeQuery(string? Type = null) : IQuery<IReadOnlyList<LocationListItem>>;
public sealed record GetPhysicalFoldersQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    FolderFilter? Filter = null) : IQuery<PagedResult<FolderListItem>>;
public sealed record GetPhysicalFolderQuery(Guid Id) : IQuery<FolderDetails>;
public sealed record FindPhysicalFolderByBarcodeQuery(string Barcode) : IQuery<FolderDetails>;
public sealed record GetLocationOccupancyQuery : IQuery<IReadOnlyList<LocationOccupancyItem>>;
public sealed record GetPhysicalLoansQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    LoanFilter? Filter = null) : IQuery<PagedResult<LoanDetailsItem>>;
public sealed record GetOverduePhysicalLoansQuery : IQuery<IReadOnlyList<LoanListItem>>;

/// <summary>Yerleşim seviyesi kataloğu; arayüz etiketleri ve kurallar buradan okunur.</summary>
public sealed record GetLocationTypesQuery : IQuery<IReadOnlyList<LocationTypeItem>>;

public sealed record LocationTypeItem(
    string Code, string Name, int Level, bool CanStoreFolder, bool AllowsCapacity,
    bool IsActive, bool IsBuiltIn, int LocationCount);

public sealed class PhysicalArchiveQueryHandlers :
    IQueryHandler<GetLocationTreeQuery, IReadOnlyList<LocationListItem>>,
    IQueryHandler<GetPhysicalFoldersQuery, PagedResult<FolderListItem>>,
    IQueryHandler<GetPhysicalFolderQuery, FolderDetails>,
    IQueryHandler<FindPhysicalFolderByBarcodeQuery, FolderDetails>,
    IQueryHandler<GetLocationOccupancyQuery, IReadOnlyList<LocationOccupancyItem>>,
    IQueryHandler<GetPhysicalLoansQuery, PagedResult<LoanDetailsItem>>,
    IQueryHandler<GetOverduePhysicalLoansQuery, IReadOnlyList<LoanListItem>>,
    IQueryHandler<GetLocationTypesQuery, IReadOnlyList<LocationTypeItem>>
{
    private readonly IPhysicalArchiveQueries _queries;
    private readonly TimeProvider _time;
    private readonly IDocumentVisibility _visibility;
    private readonly IPhysicalArchiveRepository _repository;

    public PhysicalArchiveQueryHandlers(
        IPhysicalArchiveQueries queries,
        TimeProvider time, IDocumentVisibility visibility,
        IPhysicalArchiveRepository repository)
    {
        _queries = queries;
        _time = time;
        _visibility = visibility;
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<LocationListItem>>> Handle(
        GetLocationTreeQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<LocationListItem>>.Success(
            await _queries.GetLocationsAsync(query.Type, cancellationToken));

    public async Task<Result<PagedResult<FolderListItem>>> Handle(
        GetPhysicalFoldersQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<FolderListItem>>.Failure(pageResult.Error);

        return Result<PagedResult<FolderListItem>>.Success(
            await _queries.GetFoldersPageAsync(
                pageResult.Value,
                query.Filter ?? new FolderFilter(),
                cancellationToken));
    }

    public async Task<Result<FolderDetails>> Handle(
        GetPhysicalFolderQuery query,
        CancellationToken cancellationToken)
        => await FromFolder(await _queries.GetFolderAsync(query.Id, cancellationToken), cancellationToken);

    public async Task<Result<FolderDetails>> Handle(
        FindPhysicalFolderByBarcodeQuery query,
        CancellationToken cancellationToken)
        => await FromFolder(await _queries.GetFolderByBarcodeAsync(query.Barcode, cancellationToken), cancellationToken);

    public async Task<Result<IReadOnlyList<LocationOccupancyItem>>> Handle(
        GetLocationOccupancyQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<LocationOccupancyItem>>.Success(
            await _queries.GetLocationOccupancyAsync(cancellationToken));

    public async Task<Result<PagedResult<LoanDetailsItem>>> Handle(
        GetPhysicalLoansQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<LoanDetailsItem>>.Failure(pageResult.Error);

        return Result<PagedResult<LoanDetailsItem>>.Success(
            await _queries.GetLoansPageAsync(
                pageResult.Value,
                query.Filter ?? new LoanFilter(),
                _time.GetUtcNow(),
                cancellationToken));
    }

    public async Task<Result<IReadOnlyList<LoanListItem>>> Handle(
        GetOverduePhysicalLoansQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<LoanListItem>>.Success(
            await _queries.GetOverdueLoansAsync(_time.GetUtcNow(), cancellationToken));

    private async Task<Result<FolderDetails>> FromFolder(FolderDetails? folder, CancellationToken ct)
    {
        if (folder is null) return Result<FolderDetails>.Failure(
            Error.NotFound("physical_archive.folder_not_found", "Physical folder was not found."));
        var visible = await _visibility.FilterAsync(folder.DocumentIds.ToArray(), ct);
        return Result<FolderDetails>.Success(folder with { DocumentIds = folder.DocumentIds.Where(visible.Contains).ToArray(), Dispositions = folder.Dispositions?.Where(x => visible.Contains(x.DocumentId)).ToArray() });
    }

    public async Task<Result<IReadOnlyList<LocationTypeItem>>> Handle(
        GetLocationTypesQuery query,
        CancellationToken cancellationToken)
    {
        var definitions = await _repository.GetLocationTypesAsync(cancellationToken);
        var items = new List<LocationTypeItem>(definitions.Count);

        foreach (var definition in definitions)
        {
            items.Add(new LocationTypeItem(
                definition.Code,
                definition.Name,
                definition.Level,
                definition.CanStoreFolder,
                definition.AllowsCapacity,
                definition.IsActive,
                definition.IsBuiltIn,
                await _repository.LocationCountByTypeAsync(definition.Code, cancellationToken)));
        }

        return Result<IReadOnlyList<LocationTypeItem>>.Success(items);
    }
}
