namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;

internal sealed record OutboxEnvelope(
    Guid Id,
    string EventName,
    string Payload,
    DateTimeOffset OccurredAt,
    int AttemptCount);
