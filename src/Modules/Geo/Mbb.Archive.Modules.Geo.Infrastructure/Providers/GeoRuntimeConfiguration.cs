using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

internal sealed class GeoRuntimeConfiguration(IServiceScopeFactory scopes, IGeoSecretProtector protector)
    : IGeoRuntimeConfiguration
{
    private volatile GeoRuntime _current = GeoRuntime.Empty;

    public GeoRuntime Current => _current;

    public async Task RefreshAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<IGeoServiceStore>();

        var basemap = await store.GetBasemapAsync(ct);
        var services = await store.GetServicesAsync(ct);

        _current = new GeoRuntime(
            new GeoRuntimeBasemap(basemap.TileUrl, basemap.Attribution,
                basemap.CenterLatitude, basemap.CenterLongitude, basemap.Zoom),
            services
                .Where(service => service.IsActive)
                .OrderBy(service => service.SortOrder)
                .Select(service => new GeoRuntimeService(
                    service.Id,
                    service.Kind.ToString(),
                    service.Title,
                    service.BaseUrl,
                    service.UserName,
                    protector.Unprotect(service.PasswordCipher).Value,
                    service.TimeoutSeconds,
                    service.Layers
                        .Where(layer => layer.IsActive)
                        .OrderBy(layer => layer.SortOrder)
                        .Select(layer => new GeoRuntimeLayer(
                            layer.Id, layer.LayerName, layer.Title, layer.EntityType,
                            layer.NameAttribute, layer.VisibleByDefault, layer.OpacityPercent,
                            layer.ImageFormat, layer.IsQueryable))
                        .ToList(),
                    protector.Unprotect(service.PasswordCipher).IsUnreadable))
                .ToList());
    }
}

/// <summary>
/// Açılışta yapılandırmayı yükler ve düzenli aralıkla tazeler.
/// </summary>
/// <remarks>
/// Tazeleme, çok örnekli kurulumda başka bir örnekte yapılan değişikliğin
/// yayılmasını sağlar. Aynı örnekte yapılan değişiklik zaten anında uygulanır.
/// Yükleme başarısız olursa uygulama ayağa kalkmaya devam eder: CBS isteğe
/// bağlı bir entegrasyondur, yokluğu arşivi durdurmamalı.
/// </remarks>
internal sealed class GeoRuntimeRefresher(
    IGeoRuntimeConfiguration configuration,
    ILogger<GeoRuntimeRefresher> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await configuration.RefreshAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "CBS yapılandırması okunamadı; bir sonraki denemede yeniden alınacak.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
