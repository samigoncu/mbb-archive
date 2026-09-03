using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.List;

public sealed record GetDocumentsQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize)
    : IQuery<PagedResult<DocumentListItem>>;

public sealed record DocumentListItem(
    Guid Id,
    string Title,
    string Status,
    DateTimeOffset CreatedAt,
    int VersionCount);
