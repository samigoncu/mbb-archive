namespace Mbb.Archive.Modules.Retention.Contracts;

public interface IRetentionRuleCatalog
{
    Task<bool> ExistsAsync(string code, CancellationToken cancellationToken);
}
