using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;
public sealed class DirectorySyncRun
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public string Kind { get; set; } = "";
    public string SubjectId { get; set; } = "";
    public string RequestedBy { get; set; } = "";
    public string Status { get; set; } = "";
    public string Summary { get; set; } = "";
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}
internal sealed class DirectoryAdministration(OrganizationDbContext db, DirectorySyncService sync,
    IDirectoryClient directory, IDirectoryRuntime runtime, IOptions<LdapOptions> options,
    TimeProvider time) : IDirectoryAdministration
{
    /// <remarks>
    /// Yönetim ekranındaki ayar ortam değişkenine üstün geldiği için durum da
    /// bağlayıcının kendi kararından okunur; panelde kaydedilen sunucu
    /// "yapılandırılmamış" görünmesin.
    /// </remarks>
    public DirectoryStatus Status => new(directory.IsConfigured,
        directory.IsConfigured && !string.IsNullOrWhiteSpace(
            runtime.Current.IsConfigured ? runtime.Current.UnitSearchBase : options.Value.UnitSearchBase),
        "OIDC");
    public Task<Result<DirectorySyncReport>> SyncUnitsAsync(string actor, CancellationToken ct) =>
        Run("units", "", actor, () => sync.SyncUnitsAsync(ct), ct);
    public Task<Result<DirectorySyncReport>> SyncUserAsync(string subjectId, string directoryUserName, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(subjectId) || subjectId.Length > 200 || string.IsNullOrWhiteSpace(directoryUserName) || directoryUserName.Length > 200)
            return Task.FromResult(Result<DirectorySyncReport>.Failure(Error.Validation("directory.subject_required", "Özne kimliği ve dizin kullanıcı adı zorunludur (en fazla 200 karakter).")));
        return Run("user", subjectId.Trim(), actor, () => sync.SyncUserAsync(subjectId.Trim(), ct, directoryUserName.Trim()), ct);
    }
    public async Task<IReadOnlyList<DirectoryRun>> HistoryAsync(CancellationToken ct) =>
        await db.DirectoryRuns.AsNoTracking().OrderByDescending(x => x.StartedAt).Take(50)
            .Select(x => new DirectoryRun(x.Id, x.Kind, x.SubjectId, x.RequestedBy, x.Status, x.Summary, x.StartedAt, x.CompletedAt)).ToListAsync(ct);
    private async Task<Result<DirectorySyncReport>> Run(string kind, string subject, string actor,
        Func<Task<Result<DirectorySyncReport>>> operation, CancellationToken ct)
    {
        var start = time.GetUtcNow();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72855303)", ct);
        Result<DirectorySyncReport> result;
        try { result = await operation(); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception) { result = Result<DirectorySyncReport>.Failure(Error.Failure("directory.sync_failed", "Dizin eşitlemesi tamamlanamadı; hiçbir değişiklik uygulanmadı.")); }
        if (result.IsFailure)
        {
            await tx.RollbackAsync(ct); await tx.DisposeAsync(); db.ChangeTracker.Clear();
            db.DirectoryRuns.Add(new() { Kind = kind, SubjectId = subject, RequestedBy = actor, Status = "Failed",
                Summary = result.Error.Description, StartedAt = start, CompletedAt = time.GetUtcNow() });
            await db.SaveChangesAsync(ct);
        }
        else
        {
            db.DirectoryRuns.Add(new() { Kind = kind, SubjectId = subject, RequestedBy = actor, Status = "Completed",
                Summary = JsonSerializer.Serialize(result.Value), StartedAt = start, CompletedAt = time.GetUtcNow() });
            await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        }
        return result;
    }
}
