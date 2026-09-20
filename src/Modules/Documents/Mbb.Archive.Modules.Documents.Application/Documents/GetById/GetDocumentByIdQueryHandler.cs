using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetById;

public sealed class GetDocumentByIdQueryHandler
    : IQueryHandler<GetDocumentByIdQuery, DocumentDetails>
{
    private readonly IDocumentQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetDocumentByIdQueryHandler(IDocumentQueries queries, ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
    }

    public async Task<Result<DocumentDetails>> Handle(
        GetDocumentByIdQuery query,
        CancellationToken cancellationToken)
    {
        var scope = await _scope.GetAsync(cancellationToken);
        var document = await _queries.GetByIdAsync(query.Id, scope, cancellationToken);

        return document is null
            ? Result<DocumentDetails>.Failure(
                Error.NotFound("documents.not_found", "Document was not found."))
            : Result<DocumentDetails>.Success(document);
    }
}
