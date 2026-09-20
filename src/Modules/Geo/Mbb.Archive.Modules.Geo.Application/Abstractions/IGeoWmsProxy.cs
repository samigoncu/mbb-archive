namespace Mbb.Archive.Modules.Geo.Application.Abstractions;

public sealed record WmsProxyResponse(int StatusCode, string ContentType, byte[] Content);

/// <summary>
/// WMS isteklerini sunucu üzerinden geçirir.
/// </summary>
/// <remarks>
/// Tarayıcı WMS sunucusuna doğrudan gidemez: kimlik bilgisi istemciye
/// düşmemeli ve servis çoğu kurumda yalnız iç ağdan erişilebilir. Vekil
/// yalnız bilinen OGC parametrelerini iletir; adres ve kimlik sunucuda kalır.
/// </remarks>
public interface IGeoWmsProxy
{
    Task<WmsProxyResponse> SendAsync(
        Guid serviceId,
        IReadOnlyDictionary<string, string> parameters,
        CancellationToken ct);
}
