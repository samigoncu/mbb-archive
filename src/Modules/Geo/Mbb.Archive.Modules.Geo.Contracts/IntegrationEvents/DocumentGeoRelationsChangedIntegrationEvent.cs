using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Geo.Contracts.IntegrationEvents;

/// <summary>
/// Bir belgenin aktif coğrafi ilişkilerinin tamamı. Fark değil bütün küme
/// yayınlanır: tüketici listeyi olduğu gibi değiştirir, böylece olayların
/// sırası bozulsa da projeksiyon tutarlı kalır (§11 idempotency).
/// </summary>
public sealed record DocumentGeoRelationsChangedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    IReadOnlyList<DocumentGeoRelationEntry> Relations,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "geo.document-relations-changed.v1";
}

public sealed record DocumentGeoRelationEntry(
    Guid GeoEntityId,
    string Name,
    string EntityType,
    string LayerName,
    string RelationType);
