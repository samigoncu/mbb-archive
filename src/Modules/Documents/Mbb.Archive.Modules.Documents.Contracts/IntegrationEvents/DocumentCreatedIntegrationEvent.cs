using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;

/// <param name="OwnerUnitPath">
/// Sahibi birimin materyalize yolu. Arama projeksiyonu kapsam süzgecini bu
/// alanla kurar; boş gelirse belge kapsam süzgecinde kimseye görünmez.
/// </param>
public sealed record DocumentCreatedIntegrationEvent(
    Guid EventId,
    Guid DocumentId,
    string Title,
    DateTimeOffset OccurredAt,
    string? OwnerUnitPath = null) : IIntegrationEvent
{
    public string EventName => "documents.created.v1";
}
