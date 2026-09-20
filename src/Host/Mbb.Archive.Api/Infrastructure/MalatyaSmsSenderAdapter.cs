using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class MalatyaSmsSenderAdapter(IMalatyaApiClient client) : ISmsSender
{
    public async Task<SmsSendResult> SendSmsAsync(string message, IReadOnlyList<string> to, bool isOtp, string? provider, CancellationToken ct)
    {
        var result = isOtp
            ? await client.SendOtpSmsAsync(message, to, provider, ct)
            : await client.SendSmsAsync(message, to, provider, ct);

        return new SmsSendResult(result.Succeeded, result.ProviderReference, result.Error);
    }
}

