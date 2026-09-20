using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Application.Services;

public sealed record GeoLayerView(
    Guid Id, string LayerName, string Title, string EntityType, string NameAttribute,
    bool VisibleByDefault, int OpacityPercent, string? ImageFormat, bool IsQueryable,
    int SortOrder, bool IsActive);

public sealed record GeoServiceView(
    Guid Id, string Kind, string Title, string BaseUrl, string? UserName,
    /// <summary>Parolanın kendisi hiçbir zaman dönmez; yalnız tanımlı olup olmadığı bildirilir.</summary>
    bool HasPassword,
    int TimeoutSeconds, bool IsActive, int SortOrder,
    DateTimeOffset? UpdatedAt, string UpdatedBy,
    IReadOnlyList<GeoLayerView> Layers);

public sealed record GeoBasemapView(
    string TileUrl, string Attribution, double CenterLatitude, double CenterLongitude,
    int Zoom, long Version, DateTimeOffset? UpdatedAt, string UpdatedBy);

public sealed record GeoConfiguration(GeoBasemapView Basemap, IReadOnlyList<GeoServiceView> Services);

public sealed record SaveGeoService(
    string Kind, string Title, string BaseUrl, string? UserName,
    /// <summary>null: parolayı değiştirme · "": parolayı sil · dolu: yeni parola.</summary>
    string? Password,
    int TimeoutSeconds);

public sealed record SaveGeoLayer(
    string LayerName, string Title, string EntityType, string NameAttribute,
    bool VisibleByDefault, int OpacityPercent, string? ImageFormat, bool IsQueryable);

public sealed record SaveGeoBasemap(
    string TileUrl, string Attribution, double CenterLatitude, double CenterLongitude,
    int Zoom, long ExpectedVersion);

public sealed class GeoAdminHandler(
    IGeoServiceStore store,
    IGeoSecretProtector protector,
    IGeoCapabilitiesReader capabilities,
    IUnitOfWork<GeoBoundary> uow,
    ICurrentUserPermissions user,
    TimeProvider time)
{
    public async Task<GeoConfiguration> GetAsync(CancellationToken ct)
    {
        var basemap = await store.GetBasemapAsync(ct);
        var services = await store.GetServicesAsync(ct);
        return new(View(basemap), services.OrderBy(x => x.SortOrder).ThenBy(x => x.Title).Select(View).ToList());
    }

    public async Task<Result<GeoConfiguration>> SaveBasemapAsync(SaveGeoBasemap request, CancellationToken ct)
    {
        var basemap = await store.GetBasemapAsync(ct);
        if (request.ExpectedVersion != basemap.Version)
            return Conflict("Harita ayarı başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin.");

        try
        {
            basemap.Change(request.TileUrl, request.Attribution, request.CenterLatitude,
                request.CenterLongitude, request.Zoom, user.Subject, time.GetUtcNow());
        }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> CreateServiceAsync(SaveGeoService request, CancellationToken ct)
    {
        if (!Enum.TryParse<GeoServiceKind>(request.Kind, ignoreCase: true, out var kind))
            return Invalid("Servis türü WFS veya WMS olmalıdır.");

        try
        {
            var service = GeoService.Create(kind, request.Title, request.BaseUrl, request.UserName,
                Cipher(request.Password), request.TimeoutSeconds, user.Subject, time.GetUtcNow());
            store.Add(service);
        }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> UpdateServiceAsync(Guid id, SaveGeoService request, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(id, ct);
        if (service is null) return NotFound();

        try
        {
            service.Update(request.Title, request.BaseUrl, request.UserName,
                Cipher(request.Password), request.TimeoutSeconds, user.Subject, time.GetUtcNow());
        }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> SetServiceActiveAsync(Guid id, bool isActive, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(id, ct);
        if (service is null) return NotFound();

        service.SetActive(isActive, user.Subject, time.GetUtcNow());
        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    /// <summary>
    /// Servisi siler. İçe aktarılmış varlıklar geo.entities içinde kalır:
    /// bunlar arşiv kaydıdır, bağlı oldukları servis kaldırılsa da silinmez.
    /// </summary>
    public async Task<Result<GeoConfiguration>> DeleteServiceAsync(Guid id, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(id, ct);
        if (service is null) return NotFound();

        store.Remove(service);
        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> AddLayerAsync(Guid serviceId, SaveGeoLayer request, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(serviceId, ct);
        if (service is null) return NotFound();

        try
        {
            service.AddLayer(request.LayerName, request.Title, request.EntityType, request.NameAttribute,
                request.VisibleByDefault, request.OpacityPercent, request.ImageFormat, request.IsQueryable);
        }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> UpdateLayerAsync(
        Guid serviceId, Guid layerId, SaveGeoLayer request, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(serviceId, ct);
        if (service is null) return NotFound();

        try
        {
            service.Layer(layerId).Update(request.LayerName, request.Title, request.EntityType,
                request.NameAttribute, request.VisibleByDefault, request.OpacityPercent,
                request.ImageFormat, request.IsQueryable);
        }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    public async Task<Result<GeoConfiguration>> RemoveLayerAsync(Guid serviceId, Guid layerId, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(serviceId, ct);
        if (service is null) return NotFound();

        try { service.RemoveLayer(layerId); }
        catch (DomainRuleViolationException exception) { return Invalid(exception.Message); }

        await uow.SaveChangesAsync(ct);
        return Result<GeoConfiguration>.Success(await GetAsync(ct));
    }

    /// <summary>GetCapabilities'i okur ve henüz eklenmemiş katmanları işaretler.</summary>
    public async Task<Result<IReadOnlyList<DiscoveredLayerView>>> DiscoverAsync(Guid serviceId, CancellationToken ct)
    {
        var service = await store.GetServiceAsync(serviceId, ct);
        if (service is null)
            return Result<IReadOnlyList<DiscoveredLayerView>>.Failure(
                Error.NotFound("geo.service_not_found", "CBS servisi bulunamadı."));

        try
        {
            var discovered = await capabilities.DiscoverAsync(service, ct);
            var existing = service.Layers.Select(x => x.LayerName).ToHashSet(StringComparer.OrdinalIgnoreCase);
            return Result<IReadOnlyList<DiscoveredLayerView>>.Success(
                discovered.Select(x => new DiscoveredLayerView(x.LayerName, x.Title, x.Abstract, x.IsQueryable, existing.Contains(x.LayerName))).ToList());
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return Result<IReadOnlyList<DiscoveredLayerView>>.Failure(
                Error.Validation("geo.capabilities_failed", $"Servisten katman listesi alınamadı: {exception.Message}"));
        }
    }

    private string? Cipher(string? password) => password switch
    {
        null => null,
        "" => "",
        _ => protector.Protect(password),
    };

    private static GeoBasemapView View(GeoBasemap basemap) => new(
        basemap.TileUrl, basemap.Attribution, basemap.CenterLatitude, basemap.CenterLongitude,
        basemap.Zoom, basemap.Version, basemap.UpdatedAt, basemap.UpdatedBy);

    private static GeoServiceView View(GeoService service) => new(
        service.Id, service.Kind.ToString(), service.Title, service.BaseUrl, service.UserName,
        !string.IsNullOrEmpty(service.PasswordCipher), service.TimeoutSeconds, service.IsActive,
        service.SortOrder, service.UpdatedAt, service.UpdatedBy,
        service.Layers.OrderBy(x => x.SortOrder).Select(layer => new GeoLayerView(
            layer.Id, layer.LayerName, layer.Title, layer.EntityType, layer.NameAttribute,
            layer.VisibleByDefault, layer.OpacityPercent, layer.ImageFormat, layer.IsQueryable,
            layer.SortOrder, layer.IsActive)).ToList());

    private static Result<GeoConfiguration> Invalid(string message)
        => Result<GeoConfiguration>.Failure(Error.Validation("geo.invalid", message));

    private static Result<GeoConfiguration> Conflict(string message)
        => Result<GeoConfiguration>.Failure(Error.Conflict("geo.conflict", message));

    private static Result<GeoConfiguration> NotFound()
        => Result<GeoConfiguration>.Failure(Error.NotFound("geo.service_not_found", "CBS servisi bulunamadı."));
}

public sealed record DiscoveredLayerView(
    string LayerName, string Title, string? Abstract, bool IsQueryable, bool AlreadyAdded);
