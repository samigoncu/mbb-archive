using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
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
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = ".docx",
        ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = ".xlsx",
        ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] = ".pptx",
        ["application/vnd.oasis.opendocument.text"] = ".odt",
        ["application/vnd.oasis.opendocument.spreadsheet"] = ".ods",
        ["application/vnd.oasis.opendocument.presentation"] = ".odp",
        ["application/msword"] = ".doc",
        ["application/vnd.ms-excel"] = ".xls",
        ["application/vnd.ms-powerpoint"] = ".ppt",
    };

    private readonly IDocumentQueries _queries;
    private readonly IOriginalObjectStorage _storage;
    private readonly ICurrentUserScope _scope;

    public GetDocumentContentQueryHandler(
        IDocumentQueries queries,
        IOriginalObjectStorage storage,
        ICurrentUserScope scope)
    {
        _queries = queries;
        _storage = storage;
        _scope = scope;
    }

    public async Task<Result<DocumentContent>> Handle(
        GetDocumentContentQuery query,
        CancellationToken cancellationToken)
    {
        if (query.VersionNumber is <= 0)
            return Result<DocumentContent>.Failure(Error.Validation("documents.invalid_version", "Sürüm numarası pozitif olmalıdır."));

        // İndirme yolu da aynı kapsam yüklemini kullanır; liste gizlese bile
        // doğrudan bağlantıyla dosya inmez.
        var scope = await _scope.GetAsync(cancellationToken);

        var descriptor = await _queries.GetVersionContentAsync(
            query.DocumentId,
            query.VersionNumber,
            scope,
            cancellationToken);

        if (descriptor is null)
        {
            return Result<DocumentContent>.Failure(
                Error.NotFound(
                    "documents.content_not_available",
                    "Belge veya istenen sürümün orijinal içeriği bulunamadı."));
        }

        var stream = await _storage.OpenReadVersionAsync(
            descriptor.StorageKey,
            descriptor.StorageVersionId,
            cancellationToken);

        if (stream is null)
        {
            // Kayıt var ama nesne yok: bu bir bütünlük sorunudur, 404 ile gizlenmez.
            return Result<DocumentContent>.Failure(
                Error.Conflict(
                    "documents.original_missing_in_storage",
                    "Belgenin kaydı mevcut ancak özgün dosyasına depolamada erişilemiyor. Depolama bağlantısı ve dosya bütünlüğü kontrol edilmelidir."));
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
