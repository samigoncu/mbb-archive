using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Domain.Documents;

namespace Mbb.Archive.Modules.Search.Application.Projection;

/// <summary>
/// Belgenin aktif coğrafi ilişkilerinin tamamı. Geo modülü fark değil bütün
/// küme yayınlar; bu yüzden komut da tam listeyi taşır.
/// </summary>
public sealed record ApplyGeoRelationsCommand(
    Guid MessageId,
    string EventName,
    Guid DocumentId,
    IReadOnlyList<SearchGeoRelationEntry> Relations,
    DateTimeOffset OccurredAt) : ICommand;
