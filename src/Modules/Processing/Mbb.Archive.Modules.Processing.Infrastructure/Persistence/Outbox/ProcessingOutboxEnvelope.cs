namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

internal sealed record ProcessingOutboxEnvelope(
    Guid Id,
    string EventName,
    string Payload,
    DateTimeOffset OccurredAt,
    int AttemptCount);
