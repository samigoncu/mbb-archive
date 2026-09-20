using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Notifications;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Notifications;

internal sealed class MalatyaSmsNotificationChannel(ISmsSender smsSender) : INotificationChannel
{
    public NotificationChannel Channel => NotificationChannel.Sms;

    public async Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(target))
            return new(false, null, "SMS gönderimi için telefon numarası belirtilmedi.");

        var isOtp = message.Attributes.TryGetValue("isOtp", out var otpVal)
            && bool.TryParse(otpVal, out var parsedOtp)
            && parsedOtp;

        var provider = message.Attributes.TryGetValue("provider", out var p) ? p : null;

        var result = await smsSender.SendSmsAsync(message.Body, [target.Trim()], isOtp, provider, ct);

        return new NotificationSendResult(result.Succeeded, result.ProviderReference, result.Error);
    }
}

