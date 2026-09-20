using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Mbb.Archive.Modules.Geo.Application.Abstractions;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

internal sealed class GeoWmsProxy(IHttpClientFactory clients, IGeoRuntimeConfiguration configuration)
    : IGeoWmsProxy
{
    /// <summary>
    /// İletilen OGC parametreleri. Beyaz liste bilinçli: istemciden gelen
    /// rastgele bir parametrenin iç ağdaki servise geçmesini engeller.
    /// </summary>
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        "service", "request", "version", "layers", "styles", "format", "transparent",
        "srs", "crs", "bbox", "width", "height", "bgcolor", "exceptions", "time", "sld_body",
        "query_layers", "info_format", "feature_count", "i", "j", "x", "y", "buffer",
    };

    public async Task<WmsProxyResponse> SendAsync(
        Guid serviceId,
        IReadOnlyDictionary<string, string> parameters,
        CancellationToken ct)
    {
        var service = configuration.Current.Wms.FirstOrDefault(x => x.Id == serviceId);
        if (service is null)
            return new((int)HttpStatusCode.NotFound, "application/json", []);

        // Parola çözülemiyorsa kimliksiz vekillik yapılmaz; harita katmanı
        // sessizce yetkisiz kalmak yerine açık bir hata döner.
        if (service.SecretUnreadable)
            return new((int)HttpStatusCode.ServiceUnavailable, "application/json", []);

        var query = string.Join("&", parameters
            .Where(pair => Allowed.Contains(pair.Key))
            .Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));

        var builder = new UriBuilder(service.BaseUrl);
        builder.Query = string.IsNullOrEmpty(builder.Query)
            ? query
            : builder.Query.TrimStart('?') + "&" + query;

        var client = clients.CreateClient("geo-wms");
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(service.TimeoutSeconds, 1, 120));

        using var request = new HttpRequestMessage(HttpMethod.Get, builder.Uri);
        if (!string.IsNullOrWhiteSpace(service.UserName) && service.Password is not null)
        {
            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{service.UserName}:{service.Password}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        }

        try
        {
            using var response = await client.SendAsync(request, ct);
            var content = await response.Content.ReadAsByteArrayAsync(ct);
            return new(
                (int)response.StatusCode,
                response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream",
                content);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Kutucuk isteği başarısızsa harita boş kutucukla devam etmeli,
            // tüm sayfa hata vermemeli.
            return new((int)HttpStatusCode.BadGateway, "application/json", []);
        }
    }
}
