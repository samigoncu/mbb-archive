using System.Transactions;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Npgsql;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

// Module contracts execute sequentially on the monolith's shared PostgreSQL database.
// Contexts enlist independently; no module receives another module's DbContext.
internal sealed class DocumentFilingTransaction : IDocumentFilingTransaction
{
    public async Task<Result> ExecuteAsync(Func<Task<Result>> action, CancellationToken ct)
    {
        try
        {
            using var scope = new TransactionScope(TransactionScopeOption.Required,
                new TransactionOptions { IsolationLevel = IsolationLevel.Serializable, Timeout = TimeSpan.FromSeconds(30) },
                TransactionScopeAsyncFlowOption.Enabled);
            var result = await action();
            ct.ThrowIfCancellationRequested();
            if (result.IsSuccess) scope.Complete();
            return result;
        }
        catch (DbUpdateConcurrencyException) { return Conflict(); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "40001" or "40P01" }) { return Conflict(); }
        catch (PostgresException ex) when (ex.SqlState is "40001" or "40P01") { return Conflict(); }
        catch (TransactionAbortedException) { return Conflict(); }
    }
    private static Result Conflict() => Result.Failure(Error.Conflict("filing.concurrent_change", "Dosyalama sırasında kayıt değişti. Eski atamalar korunarak işlem iptal edildi; sayfayı yenileyin."));
}
