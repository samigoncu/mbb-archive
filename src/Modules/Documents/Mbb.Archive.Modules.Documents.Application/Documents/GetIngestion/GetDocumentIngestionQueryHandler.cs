using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;

public sealed class GetDocumentIngestionQueryHandler
    : IQueryHandler<GetDocumentIngestionQuery, DocumentIngestionDetails>
{
    private readonly IDocumentQueries _queries;

    public GetDocumentIngestionQueryHandler(IDocumentQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<DocumentIngestionDetails>> Handle(
        GetDocumentIngestionQuery query,
        CancellationToken cancellationToken)
    {
        var ingestion = await _queries.GetIngestionAsync(
            query.DocumentId,
            query.IngestionId,
            cancellationToken);

        return ingestion is null
            ? Result<DocumentIngestionDetails>.Failure(
                Error.NotFound(
                    "documents.ingestion_not_found",
                    "Document file ingestion was not found."))
            : Result<DocumentIngestionDetails>.Success(ingestion);
    }
}
