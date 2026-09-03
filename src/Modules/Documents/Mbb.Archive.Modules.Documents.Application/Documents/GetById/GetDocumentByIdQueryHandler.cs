using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetById;

public sealed class GetDocumentByIdQueryHandler
    : IQueryHandler<GetDocumentByIdQuery, DocumentDetails>
{
    private readonly IDocumentQueries _queries;

    public GetDocumentByIdQueryHandler(IDocumentQueries queries)
    {
        _queries = queries;
    }

    public async Task<Result<DocumentDetails>> Handle(
        GetDocumentByIdQuery query,
        CancellationToken cancellationToken)
    {
        var document = await _queries.GetByIdAsync(query.Id, cancellationToken);

        return document is null
            ? Result<DocumentDetails>.Failure(
                Error.NotFound("documents.not_found", "Document was not found."))
            : Result<DocumentDetails>.Success(document);
    }
}
