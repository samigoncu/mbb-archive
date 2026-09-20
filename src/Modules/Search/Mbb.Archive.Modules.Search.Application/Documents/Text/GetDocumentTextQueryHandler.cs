using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Text;

/// <summary>
/// Belgenin çıkarılmış/OCR metnini artifact deposundan okur. Metin henüz
/// üretilmediyse hata değil, boş sonuç döner: boru hattı hâlâ çalışıyor olabilir.
/// </summary>
public sealed class GetDocumentTextQueryHandler
    : IQueryHandler<GetDocumentTextQuery, DocumentTextResult>
{
    private readonly ISearchProjectionQueries _projections;
    private readonly IDocumentTextReader _reader;

    public GetDocumentTextQueryHandler(
        ISearchProjectionQueries projections,
        IDocumentTextReader reader)
    {
        _projections = projections;
        _reader = reader;
    }

    public async Task<Result<DocumentTextResult>> Handle(
        GetDocumentTextQuery query,
        CancellationToken cancellationToken)
    {
        var key = await _projections.GetTextStorageKeyAsync(
            query.DocumentId,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(key))
        {
            return Result<DocumentTextResult>.Success(
                new DocumentTextResult(query.DocumentId, false, string.Empty, 0, false));
        }

        var text = await _reader.ReadAsync(key, cancellationToken);

        if (text is null)
        {
            return Result<DocumentTextResult>.Success(
                new DocumentTextResult(query.DocumentId, false, string.Empty, 0, false));
        }

        var isTruncated = text.Length > query.MaxCharacters;
        var payload = isTruncated ? text[..query.MaxCharacters] : text;

        return Result<DocumentTextResult>.Success(
            new DocumentTextResult(
                query.DocumentId,
                payload.Length > 0,
                payload,
                text.Length,
                isTruncated));
    }
}
