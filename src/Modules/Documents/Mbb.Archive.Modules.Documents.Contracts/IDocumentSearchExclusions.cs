namespace Mbb.Archive.Modules.Documents.Contracts;

// Internal search contract: exclude cancelled records before paging and aggregation.
public interface IDocumentSearchExclusions
{
    Task<IReadOnlyList<Guid>> GetAsync(CancellationToken cancellationToken);
}
