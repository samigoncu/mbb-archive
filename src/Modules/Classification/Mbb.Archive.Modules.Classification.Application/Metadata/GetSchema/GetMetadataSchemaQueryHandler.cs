using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
namespace Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;
public sealed class GetMetadataSchemaQueryHandler : IQueryHandler<GetMetadataSchemaQuery,MetadataSchemaDetails>
{
    private readonly IClassificationQueries _queries;public GetMetadataSchemaQueryHandler(IClassificationQueries queries){_queries=queries;}
    public async Task<Result<MetadataSchemaDetails>> Handle(GetMetadataSchemaQuery query,CancellationToken ct)
    {
        var schema=await _queries.GetMetadataSchemaAsync(query.Id,ct);return schema is null?Result<MetadataSchemaDetails>.Failure(Error.NotFound("classification.schema_not_found","Metadata schema was not found.")):Result<MetadataSchemaDetails>.Success(schema);
    }
}
