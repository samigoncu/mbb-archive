namespace Mbb.Archive.Modules.Classification.Contracts;

/// <summary>Internal host export contract. The host checks document visibility before calling.</summary>
public interface IClassificationExportReader
{
    Task<string> ReadMetadataJsonAsync(Guid documentId, CancellationToken cancellationToken);
}
