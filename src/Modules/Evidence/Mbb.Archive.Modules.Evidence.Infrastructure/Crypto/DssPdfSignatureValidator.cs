using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

public sealed class DssValidationOptions
{
    public string? BaseUrl { get; set; }
    public string? BearerToken { get; set; }
    public int TimeoutSeconds { get; set; } = 60;
    public bool AllowLoopbackHttp { get; set; }
    public bool IsConfigured => Uri.TryCreate(BaseUrl, UriKind.Absolute, out var uri)
        && string.IsNullOrEmpty(uri.UserInfo) && string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment)
        && (uri.Scheme == "https" || (AllowLoopbackHttp && uri.Scheme == "http" && uri.IsLoopback));
}

/// <summary>Adapter for the official DSS REST document validation OpenAPI contract. No public demo endpoint is used.</summary>
public sealed class DssPdfSignatureValidator(HttpClient client, IOptions<DssValidationOptions> options) : IPdfSignatureValidator
{
    public bool IsConfigured => options.Value.IsConfigured;
    public async Task<PdfSignatureValidationResult> ValidateAsync(ReadOnlyMemory<byte> pdf, CancellationToken cancellationToken)
    {
        if (!IsConfigured) return Result(EvidenceValidationStatus.Indeterminate, "Kurum DSS doğrulama sağlayıcısı yapılandırılmamış.", false);
        if (pdf.Length == 0 || pdf.Length > 32 * 1024 * 1024 || !pdf.Span.StartsWith("%PDF-"u8))
            return Result(EvidenceValidationStatus.Invalid, "Geçerli ve en fazla 32 MB boyutunda bir PDF gereklidir.");
        var name = $"archive-{Convert.ToHexStringLower(SHA256.HashData(pdf.Span))}.pdf";
        var endpoint = new Uri(new Uri(options.Value.BaseUrl!.TrimEnd('/') + "/"), "validateSignature");
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(new { signedDocument = new { bytes = Convert.ToBase64String(pdf.Span), name }, tokenExtractionStrategy = "NONE" })
        };
        if (!string.IsNullOrWhiteSpace(options.Value.BearerToken))
            request.Headers.Authorization = new("Bearer", options.Value.BearerToken);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(options.Value.TimeoutSeconds, 1, 120)));
        try
        {
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if (!response.IsSuccessStatusCode) return Result(EvidenceValidationStatus.Indeterminate, "İmza doğrulama sağlayıcısı isteği tamamlayamadı.");
            await response.Content.LoadIntoBufferAsync(8 * 1024 * 1024, timeout.Token);
            var json = await response.Content.ReadAsStringAsync(timeout.Token);
            return ParseReport(json, name);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        { return Result(EvidenceValidationStatus.Indeterminate, "İmza doğrulama sağlayıcısı zaman aşımına uğradı."); }
        catch (Exception error) when (error is HttpRequestException or JsonException or InvalidOperationException or IOException)
        { return Result(EvidenceValidationStatus.Indeterminate, "İmza doğrulama sağlayıcısının yanıtı alınamadı veya geçersiz."); }
    }

    public static PdfSignatureValidationResult ParseReport(string json, string expectedDocumentName)
    {
        using var document = JsonDocument.Parse(json);
        if (!document.RootElement.TryGetProperty("simpleReport", out var report)
            || !report.TryGetProperty("documentName", out var name) || name.GetString() != expectedDocumentName
            || !report.TryGetProperty("signaturesCount", out var count) || !count.TryGetInt32(out var signatures) || signatures < 0)
            return Result(EvidenceValidationStatus.Indeterminate, "Doğrulama raporu gönderilen belgeyle eşleştirilemedi.");
        if (signatures == 0) return new(EvidenceValidationStatus.Invalid, "DSS REST", true, ["PDF içinde doğrulanabilir imza bulunmadı."], json);
        if (!report.TryGetProperty("signatureOrTimestampOrEvidenceRecord", out var tokens) || tokens.ValueKind != JsonValueKind.Array)
            return Result(EvidenceValidationStatus.Indeterminate, "İmza kararları eksik olan rapor geçerli kabul edilmedi.");
        var indications = tokens.EnumerateArray().Select(x => x.TryGetProperty("indication", out var value) ? value.GetString() : null).ToArray();
        var invalid = indications.Any(x => x is "TOTAL_FAILED" or "FAILED" or "NO_SIGNATURE_FOUND");
        var valid = indications.Length >= signatures && indications.All(x => x == "TOTAL_PASSED")
            && report.TryGetProperty("validSignaturesCount", out var validCount) && validCount.TryGetInt32(out var total) && total == signatures;
        var status = invalid ? EvidenceValidationStatus.Invalid : valid ? EvidenceValidationStatus.Valid : EvidenceValidationStatus.Indeterminate;
        return new(status, "DSS REST", true,
            [$"Kurum sağlayıcısı raporu: {signatures} imza; kararlar: {string.Join(", ", indications)}.",
             "Sertifika güveni ve doğrulama politikası kurum DSS servisinde yönetilir."], json);
    }

    private static PdfSignatureValidationResult Result(EvidenceValidationStatus status, string message, bool configured = true)
        => new(status, "DSS REST", configured, [message]);
}
