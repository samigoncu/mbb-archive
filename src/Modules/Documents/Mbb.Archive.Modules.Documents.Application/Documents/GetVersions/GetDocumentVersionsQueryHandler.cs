using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;

public sealed class GetDocumentVersionsQueryHandler
    : IQueryHandler<GetDocumentVersionsQuery, IReadOnlyList<DocumentVersionSummary>>
{
    private readonly IDocumentQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetDocumentVersionsQueryHandler(IDocumentQueries queries, ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
    }

    public async Task<Result<IReadOnlyList<DocumentVersionSummary>>> Handle(
        GetDocumentVersionsQuery query,
        CancellationToken cancellationToken)
    {
        var scope = await _scope.GetAsync(cancellationToken);
        var document = await _queries.GetByIdAsync(query.DocumentId, scope, cancellationToken);

        if (document is null)
        {
            return Result<IReadOnlyList<DocumentVersionSummary>>.Failure(
                Error.NotFound("documents.not_found", "Document was not found."));
        }

        var versions = await _queries.GetVersionsAsync(
            query.DocumentId,
            scope,
            cancellationToken);

        return Result<IReadOnlyList<DocumentVersionSummary>>.Success(versions);
    }
}
