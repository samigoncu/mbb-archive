using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Search;

public sealed record SearchDocumentsQuery(
    string Query,
    int Page = 1,
    int PageSize = 25,
    string? MimeType = null,
    string? FilePlanCode = null,
    string? MetadataKey = null,
    string? MetadataValue = null) : IQuery<SearchResponse>;
