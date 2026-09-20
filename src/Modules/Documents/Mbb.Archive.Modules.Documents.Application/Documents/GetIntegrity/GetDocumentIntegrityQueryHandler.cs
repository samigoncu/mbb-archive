using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetIntegrity;

public sealed class GetDocumentIntegrityQueryHandler
    : IQueryHandler<GetDocumentIntegrityQuery, DocumentIntegrityDetails>
{
    private readonly IDocumentQueries _queries;
    private readonly ICurrentUserScope _scope;

    public GetDocumentIntegrityQueryHandler(
        IDocumentQueries queries,
        ICurrentUserScope scope)
    {
        _queries = queries;
        _scope = scope;
    }

    public async Task<Result<DocumentIntegrityDetails>> Handle(
        GetDocumentIntegrityQuery query,
        CancellationToken cancellationToken)
    {
        var descriptor = await _queries.GetLatestVersionContentAsync(
            query.DocumentId,
            await _scope.GetAsync(cancellationToken),
            cancellationToken);

        if (descriptor is null)
        {
            return Result<DocumentIntegrityDetails>.Failure(
                Error.NotFound(
                    "documents.version_not_found",
                    "Document has no stored version yet."));
        }

        return Result<DocumentIntegrityDetails>.Success(
            new DocumentIntegrityDetails(
                query.DocumentId,
                descriptor.VersionNumber,
                descriptor.MimeType,
                descriptor.SizeBytes,
                descriptor.Sha256Hash));
    }
}
