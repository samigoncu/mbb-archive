using Mbb.Archive.Modules.Operations.Domain.Notifications;

namespace Mbb.Archive.Modules.Operations.Application.Notifications;

public sealed record NotificationMessage(string Subject, string Body, IReadOnlyDictionary<string, string> Attributes);
public sealed record NotificationSendResult(bool Succeeded, string? ProviderReference, string? Error);

public interface INotificationChannel
{
    NotificationChannel Channel { get; }
    Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken cancellationToken);
}
