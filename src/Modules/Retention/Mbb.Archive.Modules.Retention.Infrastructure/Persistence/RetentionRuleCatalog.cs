using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Retention.Contracts;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class RetentionRuleCatalog(RetentionDbContext db) : IRetentionRuleCatalog
{
    public Task<bool> ExistsAsync(string code, CancellationToken cancellationToken)
        => db.Rules.AsNoTracking().AnyAsync(rule => rule.Code == code, cancellationToken);
}
