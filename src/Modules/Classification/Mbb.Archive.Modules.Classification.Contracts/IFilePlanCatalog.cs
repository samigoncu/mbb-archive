namespace Mbb.Archive.Modules.Classification.Contracts;

public interface IFilePlanCatalog
{
    Task<bool> IsSelectableAsync(string code, DateOnly at, CancellationToken cancellationToken);
}
