using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentFileStagedIntegrationEvent(
    Guid EventId,
    Guid IngestionId,
    Guid DocumentId,
    string StorageKey,
    string Sha256Hash,
    long SizeBytes,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.file-staged.v1";
}
