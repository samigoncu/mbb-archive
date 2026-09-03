using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Timestamp;

internal sealed class HttpRfc3161TimestampClient
    : IRfc3161TimestampClient
{
    private readonly HttpClient _httpClient;
    private readonly TimestampAuthorityOptions _options;

    public HttpRfc3161TimestampClient(
        HttpClient httpClient,
        IOptions<TimestampAuthorityOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<IssuedTimestamp> RequestAsync(
        ReadOnlyMemory<byte> data,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Url))
        {
            throw new InvalidOperationException(
                "Evidence:TimestampAuthority:Url is not configured.");
        }

        var algorithm = ParseHashAlgorithm(_options.HashAlgorithm);

        var request = Rfc3161TimestampRequest.CreateFromData(
            data.Span,
            algorithm,
            requestSignerCertificates: true);

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            _options.Url);

        httpRequest.Content = new ByteArrayContent(request.Encode());
        httpRequest.Content.Headers.ContentType =
            new MediaTypeHeaderValue("application/timestamp-query");
        httpRequest.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/timestamp-reply"));

        using var timeout =
            CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

        using var response = await _httpClient.SendAsync(
            httpRequest,
            HttpCompletionOption.ResponseHeadersRead,
            timeout.Token);

        response.EnsureSuccessStatusCode();

        var responseBytes = await response.Content.ReadAsByteArrayAsync(timeout.Token);
        var token = request.ProcessResponse(responseBytes, out var consumed);

        if (consumed != responseBytes.Length)
        {
            throw new CryptographicException(
                "Timestamp authority response contains trailing data.");
        }

        if (!token.VerifySignatureForData(data.Span, out var tsaCertificate)
            || tsaCertificate is null)
        {
            throw new CryptographicException(
                "Timestamp authority returned a token that does not validate for the requested data.");
        }

        return new IssuedTimestamp(
            token.AsSignedCms().Encode(),
            token.TokenInfo.Timestamp,
            token.TokenInfo.PolicyId.Value ?? string.Empty,
            token.TokenInfo.HashAlgorithmId.Value ?? string.Empty,
            tsaCertificate.Subject);
    }

    private static HashAlgorithmName ParseHashAlgorithm(string value)
        => value.Trim().ToUpperInvariant() switch
        {
            "SHA256" => HashAlgorithmName.SHA256,
            "SHA384" => HashAlgorithmName.SHA384,
            "SHA512" => HashAlgorithmName.SHA512,
            _ => throw new InvalidOperationException(
                "Timestamp hash algorithm must be SHA256, SHA384, or SHA512.")
        };
}
