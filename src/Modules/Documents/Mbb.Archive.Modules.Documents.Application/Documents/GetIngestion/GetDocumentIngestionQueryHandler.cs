using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;

public sealed class GetDocumentIngestionQueryHandler
    : IQueryHandler<GetDocumentIngestionQuery, DocumentIngestionDetails>
{
    private readonly IDocumentQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetDocumentIngestionQueryHandler(IDocumentQueries queries, ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
    }

    public async Task<Result<DocumentIngestionDetails>> Handle(
        GetDocumentIngestionQuery query,
        CancellationToken cancellationToken)
    {
        var scope = await _scope.GetAsync(cancellationToken);

        var ingestion = await _queries.GetIngestionAsync(
            query.DocumentId,
            query.IngestionId,
            scope,
            cancellationToken);

        return ingestion is null
            ? Result<DocumentIngestionDetails>.Failure(
                Error.NotFound(
                    "documents.ingestion_not_found",
                    "Document file ingestion was not found."))
            : Result<DocumentIngestionDetails>.Success(ingestion);
    }
}
