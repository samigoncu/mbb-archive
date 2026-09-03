using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Documents.Domain.Documents.Events;

public sealed record DocumentArchivedDomainEvent(
    DocumentId DocumentId,
    DateTimeOffset OccurredAt) : IDomainEvent;
