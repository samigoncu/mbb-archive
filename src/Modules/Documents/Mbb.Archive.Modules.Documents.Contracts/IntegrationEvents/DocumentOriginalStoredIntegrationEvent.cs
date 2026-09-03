using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

public sealed record DocumentOriginalStoredIntegrationEvent(
    Guid EventId,
    Guid IngestionId,
    Guid DocumentId,
    Guid DocumentVersionId,
    int VersionNumber,
    string OriginalStorageKey,
    string Sha256Hash,
    long SizeBytes,
    string MimeType,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.original-stored.v1";
}
