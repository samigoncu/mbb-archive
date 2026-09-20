using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Domain.Settings;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

namespace Mbb.Archive.Modules.Documents.Application.Settings;

public interface IUploadPolicyStore
{
    Task<UploadPolicy> GetAsync(CancellationToken ct);
    long InfrastructureMaxBytes { get; }
}
public sealed record UploadPolicyDetails(int MaxFileSizeMb, long MaxUploadBytes, int MaximumAllowedMb,
    long Version, string UpdatedBy, DateTimeOffset? UpdatedAt);
public sealed record UpdateUploadPolicy(int MaxFileSizeMb, long ExpectedVersion);

public sealed class UploadPolicyHandler(IUploadPolicyStore store, ICurrentUserPermissions permissions,
    IUnitOfWork<DocumentsBoundary> uow, IOutbox<DocumentsBoundary> outbox, TimeProvider time)
{
    public async Task<UploadPolicyDetails> GetAsync(CancellationToken ct)
    {
        var policy = await store.GetAsync(ct);
        var maxMb = (int)Math.Min(2048, store.InfrastructureMaxBytes / (1024 * 1024));
        var effectiveMb = Math.Min(policy.MaxFileSizeMb, maxMb);
        return new(effectiveMb, effectiveMb * 1024L * 1024, maxMb, policy.Version, policy.UpdatedBy, policy.UpdatedAt);
    }
    public async Task<Result<UploadPolicyDetails>> UpdateAsync(UpdateUploadPolicy request, CancellationToken ct)
    {
        if (!await permissions.HasAllPermissionsAsync(ct) && !(await permissions.GetAsync(ct)).Contains("access.admin"))
            return Result<UploadPolicyDetails>.Failure(new Error("documents.settings_forbidden", "Bu ayarı yalnız sistem yöneticisi değiştirebilir.", ErrorType.Forbidden));
        var current = await GetAsync(ct);
        if (request.MaxFileSizeMb < 1 || request.MaxFileSizeMb > current.MaximumAllowedMb)
            return Result<UploadPolicyDetails>.Failure(Error.Validation("documents.upload_limit_invalid", $"Dosya sınırı 1–{current.MaximumAllowedMb} MB arasında olmalıdır."));
        if (request.ExpectedVersion != current.Version)
            return Result<UploadPolicyDetails>.Failure(Error.Conflict("documents.settings_conflict", "Ayar başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin."));
        var policy = await store.GetAsync(ct);
        var before = policy.MaxFileSizeMb;
        var now = time.GetUtcNow();
        policy.Change(request.MaxFileSizeMb, permissions.Subject, now);
        outbox.Enqueue(new UploadPolicyChangedIntegrationEvent(Guid.CreateVersion7(), before,
            policy.MaxFileSizeMb, permissions.Subject, policy.Version, now));
        await uow.SaveChangesAsync(ct);
        return Result<UploadPolicyDetails>.Success(await GetAsync(ct));
    }
}
