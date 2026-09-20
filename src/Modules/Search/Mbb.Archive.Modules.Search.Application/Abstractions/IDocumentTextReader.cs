namespace Mbb.Archive.Modules.Search.Application.Abstractions;

public interface IDocumentTextReader
{
    /// <summary>Artifact bulunamazsa null döner; çağıran bunu hata saymaz.</summary>
    Task<string?> ReadAsync(string storageKey, CancellationToken cancellationToken);
}
