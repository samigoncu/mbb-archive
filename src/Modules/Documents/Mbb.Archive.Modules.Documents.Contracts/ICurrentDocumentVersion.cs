namespace Mbb.Archive.Modules.Documents.Contracts;
// Internal projection source. HTTP access must use the scoped filing catalog.
public interface ICurrentDocumentVersion
{
    Task<CurrentDocumentVersion?> GetAsync(Guid documentId, CancellationToken ct);
}
public sealed record CurrentDocumentVersion(Guid Id, string MimeType);
