namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface ISearchProjectionQueries
{
    Task<string?> GetOcrJsonStorageKeyAsync(
        Guid documentId,
        CancellationToken cancellationToken);
}
