using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Retention.Contracts;
using Microsoft.Extensions.Options;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class ArchiveProtectionOptions
{
    public bool Enabled { get; set; }
    public int IntervalSeconds { get; set; } = 300;
}

internal sealed class ArchiveProtectionService(IRetentionProtectionSource source, IOriginalProtectionSynchronizer destination)
{
    public async Task<ProtectionSyncResult> SynchronizeAsync(CancellationToken ct)
    {
        var values = await source.ListAsync(ct);
        return await destination.SynchronizeAsync(values.Select(x => new DocumentProtectionRequirement(
            x.DocumentId, x.RetainUntil, x.LegalHold, x.Permanent)).ToArray(), ct);
    }
}

internal sealed class ArchiveProtectionWorker(IServiceScopeFactory scopes, IOptions<ArchiveProtectionOptions> options,
    ILogger<ArchiveProtectionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled) return;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Clamp(options.Value.IntervalSeconds, 30, 86400)));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var result = await scope.ServiceProvider.GetRequiredService<ArchiveProtectionService>().SynchronizeAsync(stoppingToken);
                if (!result.ProviderSupported || result.Failed > 0)
                    logger.LogWarning("Archive protection incomplete: supported={Supported}, failed={Failed}", result.ProviderSupported, result.Failed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Archive protection synchronization failed; next cycle will retry."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

internal static class ArchiveProtectionEndpoints
{
    public static void MapArchiveProtection(this WebApplication app)
    {
        app.MapGet("/api/v1/documents/protection/capabilities", (IConfiguration configuration, IOptions<ArchiveProtectionOptions> options) =>
            Results.Ok(new
            {
                digitalOriginalsPreservedOnPhysicalDestruction = true,
                digitalDeletionEnabled = false,
                provider = configuration["Documents:OriginalStorage:Provider"] ?? "Local",
                objectLockConfigured = configuration.GetValue<bool>("Documents:OriginalStorage:Worm:Enabled"),
                automaticSynchronizationEnabled = options.Value.Enabled
            })).RequireAuthorization("permission:access.admin");
        app.MapGet("/api/v1/documents/{id:guid}/protection", async (Guid id, IOriginalProtectionSynchronizer service, CancellationToken ct) =>
            Results.Ok(await service.GetStatusAsync(id, ct))).RequireAuthorization("permission:documents.read");
        app.MapPost("/api/v1/documents/protection/synchronize", async (ArchiveProtectionService service, CancellationToken ct) =>
        {
            var result = await service.SynchronizeAsync(ct);
            return result.ProviderSupported ? Results.Ok(result)
                : Results.Problem(statusCode: 409, title: "Depo kilidi desteklenmiyor", detail: "Yerel dosya deposu WORM garantisi vermez; S3 Object Lock yapılandırılmalıdır.");
        }).RequireAuthorization("permission:access.admin")
            .WithAccessAudit("access.archive-protection-synchronized.v1", "archive-protection", "");
    }
}
