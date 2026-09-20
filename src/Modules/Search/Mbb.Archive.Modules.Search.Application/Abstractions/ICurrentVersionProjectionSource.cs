namespace Mbb.Archive.Modules.Search.Application.Abstractions;
public interface ICurrentVersionProjectionSource
{
    Task<CurrentVersionProjection?> GetAsync(Guid documentId, CancellationToken ct);
}
public sealed record CurrentVersionProjection(Guid VersionId, string MimeType, string? TextKey, string? OcrKey);
