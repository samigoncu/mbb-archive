using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetContent;

public sealed class GetDocumentContentQueryHandler
    : IQueryHandler<GetDocumentContentQuery, DocumentContent>
{
    private static readonly Dictionary<string, string> Extensions = new()
    {
        ["application/pdf"] = ".pdf",
        ["image/tiff"] = ".tif",
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
    };

    private readonly IDocumentQueries _queries;
    private readonly IOriginalObjectStorage _storage;

    public GetDocumentContentQueryHandler(
        IDocumentQueries queries,
        IOriginalObjectStorage storage)
    {
        _queries = queries;
        _storage = storage;
    }

    public async Task<Result<DocumentContent>> Handle(
        GetDocumentContentQuery query,
        CancellationToken cancellationToken)
    {
        var descriptor = await _queries.GetLatestVersionContentAsync(
            query.DocumentId,
            cancellationToken);

        if (descriptor is null)
        {
            return Result<DocumentContent>.Failure(
                Error.NotFound(
                    "documents.content_not_available",
                    "Document has no stored original content."));
        }

        var stream = await _storage.OpenReadAsync(
            descriptor.StorageKey,
            cancellationToken);

        if (stream is null)
        {
            // Kayıt var ama nesne yok: bu bir bütünlük sorunudur, 404 ile gizlenmez.
            return Result<DocumentContent>.Failure(
                Error.Conflict(
                    "documents.original_missing_in_storage",
                    "Stored original is registered but missing in object storage."));
        }

        var extension = Extensions.GetValueOrDefault(descriptor.MimeType, string.Empty);

        return Result<DocumentContent>.Success(
            new DocumentContent(
                stream,
                descriptor.MimeType,
                descriptor.SizeBytes,
                $"{query.DocumentId:D}-v{descriptor.VersionNumber}{extension}"));
    }
}
