using System.Net.Http.Headers;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Services;

namespace Mbb.Archive.Modules.Geo.Infrastructure.Providers;

/// <summary>
/// GetCapabilities yanıtından yayınlanan katmanları çıkarır.
/// </summary>
/// <remarks>
/// WFS ve WMS farklı şemalar kullanır ve sürümden sürüme ad alanı değişir; bu
/// yüzden eşleme ad alanından bağımsız, yerel eleman adıyla yapılır. XML
/// çözümlemesinde DTD ve dış varlık çözümü kapalıdır (XXE).
/// </remarks>
internal sealed class GeoCapabilitiesReader(IHttpClientFactory factory, IGeoSecretProtector protector)
    : IGeoCapabilitiesReader
{
    public async Task<IReadOnlyList<DiscoveredLayer>> DiscoverAsync(GeoService service, CancellationToken ct)
    {
        var client = factory.CreateClient(nameof(GeoCapabilitiesReader));
        client.Timeout = TimeSpan.FromSeconds(service.TimeoutSeconds);

        using var request = new HttpRequestMessage(HttpMethod.Get, BuildUrl(service));
        var secret = protector.Unprotect(service.PasswordCipher);

        // Kayıtlı parola çözülemiyorsa istek kimliksiz gönderilmez: sunucu
        // yetkisiz yanıt verir ve yönetici sorunu parolada arar, oysa sorun
        // şifreleme anahtarındadır.
        if (secret.IsUnreadable)
        {
            throw new InvalidOperationException(
                "servis parolası çözülemedi; parolayı yeniden girin (şifreleme anahtarı değişmiş olabilir)");
        }

        if (!string.IsNullOrWhiteSpace(service.UserName) && secret.Value is not null)
        {
            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{service.UserName}:{secret.Value}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", token);
        }

        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"sunucu {(int)response.StatusCode} döndü");

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        // DTD ve dış varlık çözümü açıkça kapatılır: yanıt dış bir sunucudan gelir.
        using var reader = XmlReader.Create(stream, new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            Async = true,
        });
        var document = await XDocument.LoadAsync(reader, LoadOptions.None, ct);

        return service.Kind == GeoServiceKind.Wms ? ReadWms(document) : ReadWfs(document);
    }

    private static string BuildUrl(GeoService service)
    {
        var separator = service.BaseUrl.Contains('?') ? "&" : "?";
        var version = service.Kind == GeoServiceKind.Wms ? "1.3.0" : "2.0.0";
        return $"{service.BaseUrl}{separator}service={service.Kind.ToString().ToUpperInvariant()}&request=GetCapabilities&version={version}";
    }

    /// <summary>WFS: FeatureTypeList → FeatureType → Name/Title. Hepsi sorgulanabilir.</summary>
    private static List<DiscoveredLayer> ReadWfs(XDocument document) =>
        document.Descendants()
            .Where(element => element.Name.LocalName == "FeatureType")
            .Select(element => new DiscoveredLayer(
                Value(element, "Name"),
                Value(element, "Title"),
                Value(element, "Abstract") is { Length: > 0 } text ? text : null,
                true))
            .Where(layer => layer.LayerName.Length > 0)
            .DistinctBy(layer => layer.LayerName, StringComparer.OrdinalIgnoreCase)
            .ToList();

    /// <summary>
    /// WMS: iç içe Layer düğümleri. Adı olmayan düğüm yalnız gruplama içindir,
    /// çizilemez; bu yüzden elenir. `queryable` özniteliği GetFeatureInfo
    /// desteğini bildirir.
    /// </summary>
    private static List<DiscoveredLayer> ReadWms(XDocument document) =>
        document.Descendants()
            .Where(element => element.Name.LocalName == "Layer")
            .Select(element => new
            {
                Name = Value(element, "Name"),
                Title = Value(element, "Title"),
                Abstract = Value(element, "Abstract"),
                Queryable = element.Attribute("queryable")?.Value is "1" or "true",
            })
            .Where(layer => layer.Name.Length > 0)
            .Select(layer => new DiscoveredLayer(
                layer.Name,
                layer.Title.Length > 0 ? layer.Title : layer.Name,
                layer.Abstract is { Length: > 0 } ? layer.Abstract : null,
                layer.Queryable))
            .DistinctBy(layer => layer.LayerName, StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static string Value(XElement parent, string localName)
        => parent.Elements().FirstOrDefault(child => child.Name.LocalName == localName)?.Value.Trim() ?? "";
}
