using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
using Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;

namespace Mbb.Archive.Modules.Classification.Application.Abstractions;

public interface IClassificationQueries
{
    Task<PagedResult<FilePlanListItem>> GetFilePlansAsync(
        PageRequest page,
        CancellationToken cancellationToken);
    Task<FilePlanTree?> GetFilePlanTreeAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<MetadataSchemaListItem>> GetMetadataSchemasAsync(
        PageRequest page,
        CancellationToken cancellationToken);
    Task<MetadataSchemaDetails?> GetMetadataSchemaAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record FilePlanListItem(
    Guid Id,
    string Code,
    string Name,
    string Version,
    string Authority,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    bool IsActive,
    int ItemCount);

public sealed record MetadataSchemaListItem(
    Guid Id,
    string Key,
    string Name,
    int Version,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt,
    int FieldCount);
