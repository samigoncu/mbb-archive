namespace Mbb.Archive.Modules.Operations.Application.Notifications;

public sealed record SmsSendResult(bool Succeeded, string? ProviderReference, string? Error);

public interface ISmsSender
{
    Task<SmsSendResult> SendSmsAsync(string message, IReadOnlyList<string> to, bool isOtp, string? provider, CancellationToken ct);
}

