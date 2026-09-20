using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Entities;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

/// <summary>
/// OGC WFS 2.0 adaptörü. Kurumun GeoServer'ı yapılandırılmadığında sessizce
/// boş liste dönmez; "yapılandırılmadı" hatası verir, böylece ekranda eksik
/// entegrasyon veri yokluğu gibi görünmez.
/// </summary>
internal sealed class WfsGeoFeatureProvider : IGeoFeatureProvider
{
    private readonly IHttpClientFactory _clients;
    private readonly IGeoRuntimeConfiguration _configuration;

    public WfsGeoFeatureProvider(
        IHttpClientFactory clients,
        IGeoRuntimeConfiguration configuration)
    {
        _clients = clients;
        _configuration = configuration;
    }

    /// <summary>Yönetim ekranından tanımlanan ilk etkin WFS servisi.</summary>
    private GeoRuntimeService? Service => _configuration.Current.Wfs;

    public string Name => "wfs";

    /// <remarks>
    /// Parola çözülemiyorsa servis "yapılandırılmamış" sayılır; kimliksiz
    /// istek göndermek sorunu yetkisiz yanıtların arkasına gizlerdi.
    /// </remarks>
    public bool IsConfigured => Service is { } service
        && service.IsUsable
        && Uri.TryCreate(service.BaseUrl, UriKind.Absolute, out var uri)
        && uri.Scheme is "http" or "https" && string.IsNullOrEmpty(uri.UserInfo);

    public IReadOnlyList<GeoLayerDescriptor> Layers
        => Service?.Layers
            .Select(layer => new GeoLayerDescriptor(
                Name,
                layer.LayerName,
                layer.Title,
                layer.EntityType,
                IsConfigured))
            .ToArray() ?? [];

    public async Task<Result<IReadOnlyList<GeoProviderFeature>>> SearchAsync(
        string layerName,
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            return Result<IReadOnlyList<GeoProviderFeature>>.Failure(NotConfigured);

        var layer = FindLayer(layerName);

        if (layer is null)
        {
            return Result<IReadOnlyList<GeoProviderFeature>>.Failure(
                Error.NotFound("geo.layer_not_found", $"Layer '{layerName}' is not published."));
        }

        // CQL yerine parametreli filtre; tırnak kaçışı yapılmadan sorgu kurulmaz.
        var filter = $"{layer.NameAttribute} ILIKE '%{EscapeCql(query)}%'";

        var parameters = new Dictionary<string, string>
        {
            ["service"] = "WFS",
            ["version"] = "2.0.0",
            ["request"] = "GetFeature",
            ["typeNames"] = layer.LayerName,
            ["outputFormat"] = "application/json",
            ["srsName"] = "EPSG:4326",
            ["count"] = Math.Clamp(limit, 1, 100).ToString(),
            ["CQL_FILTER"] = filter
        };

        return await ExecuteAsync(layer, parameters, cancellationToken);
    }

    public async Task<Result<GeoProviderFeature>> GetFeatureAsync(
        string layerName,
        string featureId,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            return Result<GeoProviderFeature>.Failure(NotConfigured);

        var layer = FindLayer(layerName);

        if (layer is null)
        {
            return Result<GeoProviderFeature>.Failure(
                Error.NotFound("geo.layer_not_found", $"Layer '{layerName}' is not published."));
        }

        var parameters = new Dictionary<string, string>
        {
            ["service"] = "WFS",
            ["version"] = "2.0.0",
            ["request"] = "GetFeature",
            ["typeNames"] = layer.LayerName,
            ["outputFormat"] = "application/json",
            ["srsName"] = "EPSG:4326",
            ["featureID"] = featureId
        };

        var result = await ExecuteAsync(layer, parameters, cancellationToken);

        if (result.IsFailure)
            return Result<GeoProviderFeature>.Failure(result.Error);

        var feature = result.Value.FirstOrDefault();

        return feature is null
            ? Result<GeoProviderFeature>.Failure(
                Error.NotFound("geo.feature_not_found", "Feature was not found on the provider."))
            : Result<GeoProviderFeature>.Success(feature);
    }

    private async Task<Result<IReadOnlyList<GeoProviderFeature>>> ExecuteAsync(
        GeoRuntimeLayer layer,
        Dictionary<string, string> parameters,
        CancellationToken cancellationToken)
    {
        var query = string.Join(
            "&",
            parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));

        var service = Service ?? throw new InvalidOperationException("WFS servisi tanımlı değil.");
        var builder = new UriBuilder(service.BaseUrl);
        builder.Query = string.IsNullOrEmpty(builder.Query) ? query : builder.Query.TrimStart('?') + "&" + query;
        var uri = builder.Uri;

        using var client = _clients.CreateClient("geo-wfs");
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(service.TimeoutSeconds, 1, 120));

        using var request = new HttpRequestMessage(HttpMethod.Get, uri);

        if (!string.IsNullOrWhiteSpace(service.UserName))
        {
            var token = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{service.UserName}:{service.Password}"));

            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        }

        try
        {
            using var response = await client.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return Result<IReadOnlyList<GeoProviderFeature>>.Failure(
                    Error.Failure(
                        "geo.provider_error",
                        $"WFS provider returned {(int)response.StatusCode}."));
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            return Result<IReadOnlyList<GeoProviderFeature>>.Success(Parse(document, layer));
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<IReadOnlyList<GeoProviderFeature>>.Failure(
                Error.Failure("geo.provider_unreachable", "WFS provider is unreachable."));
        }
        catch (JsonException)
        {
            return Result<IReadOnlyList<GeoProviderFeature>>.Failure(
                Error.Failure("geo.provider_error", "WFS provider returned malformed GeoJSON."));
        }
    }

    private IReadOnlyList<GeoProviderFeature> Parse(
        JsonDocument document,
        GeoRuntimeLayer layer)
    {
        if (!document.RootElement.TryGetProperty("features", out var features)
            || features.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException("Missing WFS feature collection.");
        }

        var entityType = Enum.TryParse<GeoEntityType>(layer.EntityType, true, out var parsed)
            ? parsed
            : GeoEntityType.CustomGeometry;

        var result = new List<GeoProviderFeature>();

        foreach (var feature in features.EnumerateArray())
        {
            if (!feature.TryGetProperty("geometry", out var geometry)
                || geometry.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var id = feature.TryGetProperty("id", out var idElement)
                ? idElement.ToString()
                : throw new JsonException("WFS feature has no stable identifier.");

            var properties = feature.TryGetProperty("properties", out var props)
                ? props
                : default;

            var name = properties.ValueKind == JsonValueKind.Object
                && properties.TryGetProperty(layer.NameAttribute, out var nameElement)
                    ? nameElement.ToString()
                    : id;

            result.Add(new GeoProviderFeature(
                Name,
                layer.LayerName,
                id,
                string.IsNullOrWhiteSpace(name) ? id : name,
                geometry.GetRawText(),
                properties.ValueKind == JsonValueKind.Object ? properties.GetRawText() : null,
                entityType));
        }

        return result;
    }

    private GeoRuntimeLayer? FindLayer(string layerName)
        => Service?.Layers.FirstOrDefault(
            x => string.Equals(x.LayerName, layerName, StringComparison.OrdinalIgnoreCase));

    /// <summary>CQL tek tırnağı ikileyerek kaçırılır.</summary>
    private static string EscapeCql(string value)
        => value.Replace("'", "''");

    private Error NotConfigured => Service is { SecretUnreadable: true }
        ? Error.Failure(
            "geo.provider_secret_unreadable",
            "CBS servis parolası çözülemiyor. Tanımlar › CBS ekranından parolayı yeniden girin.")
        : Error.Failure(
            "geo.provider_not_configured",
            "CBS/WFS servisi tanımlı değil. Tanımlar › CBS ekranından bir WFS servisi ekleyin.");
}
