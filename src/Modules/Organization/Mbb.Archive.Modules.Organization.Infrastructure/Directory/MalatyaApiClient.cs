using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

public sealed class MalatyaApiClient : IMalatyaApiClient
{
    private sealed record CachedToken(string Token, DateTimeOffset ExpiresAt);

    private readonly HttpClient _http;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MalatyaApiClient> _logger;
    private volatile CachedToken? _cachedToken;

    public MalatyaApiClient(
        HttpClient http,
        IServiceScopeFactory scopeFactory,
        ILogger<MalatyaApiClient> logger)
    {
        _http = http;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<MalatyaAuthTokenResult> LoginAsync(string baseUrl, string userName, string password, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(baseUrl)
                || !Uri.TryCreate(baseUrl.Trim().TrimEnd('/'), UriKind.Absolute, out var baseUri)
                || (baseUri.Scheme != Uri.UriSchemeHttps && baseUri.Scheme != Uri.UriSchemeHttp))
            {
                return new(false, null, null, "Geçersiz veya desteklenmeyen servis adresi (HTTP/HTTPS zorunludur).");
            }

            var uri = new Uri(baseUri, "api/v1/Auth/login");

            using var request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = JsonContent.Create(new LoginPayload(userName, password))
            };

            using var response = await _http.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Malatya API login failed: {StatusCode} {Content}", response.StatusCode, content);
                return new(false, null, null, $"Giriş başarısız (HTTP {(int)response.StatusCode}): {content}");
            }

            var parsed = JsonSerializer.Deserialize<LoginResponse>(content, JsonOptions);
            if (string.IsNullOrWhiteSpace(parsed?.Token))
            {
                return new(false, null, null, "API yanıtında geçerli bir token bulunamadı.");
            }

            DateTimeOffset expiresAt;
            if (!string.IsNullOrWhiteSpace(parsed.Expires) && DateTimeOffset.TryParse(parsed.Expires, out var dt))
            {
                expiresAt = dt;
            }
            else
            {
                expiresAt = DateTimeOffset.UtcNow.AddHours(1);
            }

            // Süre dolmadan 2 dakika önce yenilensin
            var cacheExpiry = expiresAt > DateTimeOffset.UtcNow.AddMinutes(2)
                ? expiresAt.AddMinutes(-2)
                : expiresAt;

            _cachedToken = new CachedToken(parsed.Token, cacheExpiry);

            return new(true, parsed.Token, parsed.Expires ?? expiresAt.ToString("o"), null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Malatya API login HTTP request error.");
            return new(false, null, null, $"Bağlantı hatası: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Malatya API login unexpected error.");
            return new(false, null, null, $"Beklenmeyen hata: {ex.Message}");
        }
    }

    public async Task<MalatyaAuthTokenResult> GetValidTokenAsync(CancellationToken ct)
    {
        var current = _cachedToken;
        if (current != null && current.ExpiresAt > DateTimeOffset.UtcNow && !string.IsNullOrWhiteSpace(current.Token))
        {
            return new(true, current.Token, current.ExpiresAt.ToString("o"), null);
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<IMalatyaApiSettingsStore>();
        var protector = scope.ServiceProvider.GetRequiredService<IDirectorySecretProtector>();
        var settings = await store.GetAsync(ct);

        if (string.IsNullOrWhiteSpace(settings.BaseUrl) || string.IsNullOrWhiteSpace(settings.UserName))
        {
            return new(false, null, null, "Malatya API servis adresi ve kullanıcı adı tanımlanmamış.");
        }

        var unprotected = protector.Unprotect(settings.PasswordCipher);
        if (unprotected.IsUnreadable || string.IsNullOrEmpty(unprotected.Value))
        {
            return new(false, null, null, "Malatya API parolası tanımlanmamış ya da çözülemiyor.");
        }

        return await LoginAsync(settings.BaseUrl, settings.UserName, unprotected.Value, ct);
    }

    public Task<MalatyaSmsResult> SendOtpSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct)
        => SendSmsInternalAsync("api/v1/OTP/send", message, to, provider, ct);

    public Task<MalatyaSmsResult> SendSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct)
        => SendSmsInternalAsync("api/v1/SMS/send", message, to, provider, ct);

    private async Task<MalatyaSmsResult> SendSmsInternalAsync(string relativePath, string message, IReadOnlyList<string> to, string? provider, CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var store = scope.ServiceProvider.GetRequiredService<IMalatyaApiSettingsStore>();
        var settings = await store.GetAsync(ct);

        var tokenResult = await GetValidTokenAsync(ct);
        if (!tokenResult.Succeeded || string.IsNullOrWhiteSpace(tokenResult.Token))
        {
            return new(false, null, tokenResult.Error ?? "Malatya API token alınamadı.");
        }

        if (!Uri.TryCreate(settings.BaseUrl?.Trim().TrimEnd('/'), UriKind.Absolute, out var baseUri))
        {
            return new(false, null, "Geçersiz servis adresi.");
        }
        var smsProvider = !string.IsNullOrWhiteSpace(provider) ? provider : settings.SmsProvider;
        var uri = new Uri(baseUri, relativePath.TrimStart('/'));

        var payload = new SmsPayload(message, to, smsProvider);

        var sendResult = await ExecuteSmsRequest(uri, tokenResult.Token, payload, ct);
        if (sendResult.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            // Token düşmüş olabilir, önbelleği temizleyip bir kez daha dene
            _cachedToken = null;
            var retryToken = await GetValidTokenAsync(ct);
            if (retryToken.Succeeded && !string.IsNullOrWhiteSpace(retryToken.Token))
            {
                sendResult = await ExecuteSmsRequest(uri, retryToken.Token, payload, ct);
            }
        }

        if (sendResult.IsSuccess)
        {
            return new(true, sendResult.Content, null);
        }

        return new(false, null, $"SMS gönderimi başarısız (HTTP {(int)sendResult.StatusCode}): {sendResult.Content}");
    }

    private async Task<(bool IsSuccess, System.Net.HttpStatusCode StatusCode, string Content)> ExecuteSmsRequest(
        Uri uri, string token, SmsPayload payload, CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await _http.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);
            return (response.IsSuccessStatusCode, response.StatusCode, content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMS request failed.");
            return (false, System.Net.HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed record LoginPayload(
        [property: JsonPropertyName("userName")] string UserName,
        [property: JsonPropertyName("password")] string Password);

    private sealed record LoginResponse(
        [property: JsonPropertyName("token")] string? Token,
        [property: JsonPropertyName("expires")] string? Expires);

    private sealed record SmsPayload(
        [property: JsonPropertyName("message")] string Message,
        [property: JsonPropertyName("to")] IReadOnlyList<string> To,
        [property: JsonPropertyName("provider")] string Provider);
}

