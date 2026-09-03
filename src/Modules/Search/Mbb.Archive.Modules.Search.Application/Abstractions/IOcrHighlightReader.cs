namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface IOcrHighlightReader
{
    Task<IReadOnlyList<HighlightBox>> FindAsync(
        string ocrJsonStorageKey,
        string query,
        int? pageNumber,
        CancellationToken cancellationToken);
}

public sealed record HighlightBox(
    int PageNumber,
    int PageWidth,
    int PageHeight,
    string Text,
    double Confidence,
    int X,
    int Y,
    int Width,
    int Height);
