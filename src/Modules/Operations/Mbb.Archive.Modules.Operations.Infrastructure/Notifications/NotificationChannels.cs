using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Notifications;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Notifications;

public sealed class EmailNotificationOptions
{
    public const string SectionName = "Operations:Notifications:Email";
    public string Host { get; init; } = string.Empty; public int Port { get; init; } = 587;
    public string Sender { get; init; } = string.Empty; public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty; public bool EnableSsl { get; init; } = true;
}

internal sealed class EmailNotificationChannel : INotificationChannel
{
    private readonly EmailNotificationOptions _options;
    public EmailNotificationChannel(IOptions<EmailNotificationOptions> options) { _options = options.Value; }
    public NotificationChannel Channel => NotificationChannel.Email;
    public async Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) || string.IsNullOrWhiteSpace(_options.Sender))
            return new(false, null, "Email notification channel is not configured.");
        using var mail = new MailMessage(_options.Sender, target, message.Subject, message.Body);
        using var smtp = new SmtpClient(_options.Host, _options.Port) { EnableSsl = _options.EnableSsl };
        if (!string.IsNullOrWhiteSpace(_options.Username)) smtp.Credentials = new NetworkCredential(_options.Username, _options.Password);
        try { await smtp.SendMailAsync(mail, ct); return new(true, null, null); }
        catch (Exception ex) when (ex is SmtpException or InvalidOperationException) { return new(false, null, ex.Message); }
    }
}

internal sealed class WebhookNotificationChannel : INotificationChannel
{
    private readonly HttpClient _http;
    public WebhookNotificationChannel(HttpClient http) { _http = http; }
    public NotificationChannel Channel => NotificationChannel.Webhook;
    public async Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken ct)
    {
        if (!Uri.TryCreate(target, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            return new(false, null, "Webhook target must be an absolute HTTPS URI.");
        try { using var response = await _http.PostAsJsonAsync(uri, message, ct);
            return response.IsSuccessStatusCode ? new(true, response.Headers.TryGetValues("x-request-id", out var ids) ? ids.FirstOrDefault() : null, null)
                : new(false, null, $"Webhook returned HTTP {(int)response.StatusCode}."); }
        catch (HttpRequestException ex) { return new(false, null, ex.Message); }
    }
}
